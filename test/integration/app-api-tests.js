/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Api app integration/acceptance tests (just a few sample tests, not full coverage)              */
/*                                                                                                */
/* These tests require api.localhost to be set in /etc/hosts.                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import supertest  from 'supertest';  // SuperAgent driven library for testing HTTP servers
import { expect } from 'chai';       // BDD/TDD assertion library
import Scrypt     from 'scrypt-kdf'; // scrypt key derivation function
import yaml       from 'js-yaml';    // JS object to YAML
import dotenv     from 'dotenv';     // load environment variables from a .env file into process.env
dotenv.config();

import app  from '../../app.js';
import User from '../../models/user.js';

const appApi = supertest.agent(app.listen()).host('api.localhost');


describe(`API app (${app.env})`, function() {
    const testAdmin = {
        username: `user-${Date.now().toString(36)}@example.net`,
        password: Date.now().toString(16),
    };
    const testMember = `member-${Date.now().toString(36)}@example.net`;

    let jwt = null;

    before(async function() {
        if (!process.env.DB_MYSQL_CONNECTION) throw new Error('No DB_MYSQL_CONNECTION available');
        testAdmin.userId = await User.insert({
            Firstname: 'Test',
            Lastname:  'User',
            Email:     testAdmin.username,
            Password:  (await Scrypt.kdf(testAdmin.password, { logN: 15 })).toString('base64'),
            Role:      'admin',
        });
        console.info('\tadmin user', testAdmin.userId, testAdmin.username, '/', testAdmin.password);
    });

    after(async function() {
        await User.delete(testAdmin.userId);
    });

    describe('/auth', function() {
        it('returns 404 on unrecognised email', async function() {
            const response = await appApi.get('/auth').query({ username: 'xxx@user.com', password: testAdmin.password });
            expect(response.status).to.equal(404, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns 404 on bad password', async function() {
            const response = await appApi.get('/auth').query({ username: testAdmin.username, password: 'bad-password' });
            expect(response.status).to.equal(404, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns auth details', async function() {
            const response = await appApi.get('/auth').query({ username: testAdmin.username, password: testAdmin.password });
            expect(response.status).to.equal(200, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('jwt');
            jwt = response.body.jwt;
        });
    });

    describe('/members', function() {
        describe('auth checks', function() {
            it('returns 401 on missing auth', async function() {
                const response = await appApi.get('/members');
                expect(response.status).to.equal(401, response.text);
            });

            it('returns 401 on basic auth', async function() {
                const response = await appApi.get('/members').auth(testAdmin.username, testAdmin.password);
                expect(response.status).to.equal(401, response.text);
            });

            it('returns 401 on bad auth', async function() {
                const response = await appApi.get('/members').set('Authorization', 'somejunk');
                expect(response.status).to.equal(401, response.text);
            });

            it('returns 401 on invalid bearer auth', async function() {
                const response = await appApi.get('/members').auth('xxx.xxx.xxx', { type: 'bearer' });
                expect(response.status).to.equal(401, response.text);
            });

            it('returns members list', async function() {
                const response = await appApi.get('/members').auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('array');
                expect(response.body).to.have.length.above(1);
            });
        });

        describe('CRUD', function() {
            let id = null;
            it('adds a member', async function() {
                const values = { Firstname: 'Test', Lastname: 'User', Email: testMember, Active: 'true' };
                const response = await appApi.post('/members').auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(201, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal(testMember);
                expect(response.headers.location).to.equal('/members/'+response.body.MemberId);
                id = response.body.MemberId;
            });

            it('gets a member (json)', async function() {
                const response = await appApi.get('/members/'+id).auth(jwt, { type: 'bearer' }); // set host, no accept header
                expect(response.status).to.equal(200, response.text);
                expect(response.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal(testMember);
                expect(response.body.Firstname).to.equal('Test');
                expect(response.body.Active).to.be.true;
                expect(response.body.Active).not.to.equal(1); // note Active is stored as bit(1)
            });

            it('gets a member (xml)', async function() {
                const hdrs = { Host: 'api.localhost', Accept: 'application/xml' }; // set host & accept headers
                const response = await appApi.get('/members/'+id).set(hdrs).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.headers['content-type']).to.equal('application/xml');
                expect(response.text.slice(0, 38)).to.equal('<?xml version="1.0" encoding="UTF-8"?>');
                expect(response.text.match(/<Email>(.*)<\/Email>/)[1]).to.equal(testMember);
                expect(response.text.match(/<Firstname>(.*)<\/Firstname>/)[1]).to.equal('Test');
                expect(response.text.match(/<Active>(.*)<\/Active>/)[1]).to.equal('true');
                expect(response.text.match(/<Active>(.*)<\/Active>/)[1]).not.to.equal('1'); // note Active is stored as bit(1)
            });

            it('gets a member (yaml)', async function() {
                const hdrs = { Host: 'api.localhost', Accept: 'text/yaml' }; // set host & accept headers
                const response = await appApi.get('/members/'+id).set(hdrs).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.headers['content-type']).to.equal('text/yaml; charset=utf-8');
                const body = yaml.load(response.text);
                expect(body).to.be.an('object');
                expect(body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(body.Email).to.equal(testMember);
                expect(body.Firstname).to.equal('Test');
                expect(body.Active).to.be.true;
                expect(body.Active).not.to.equal(1); // note Active is stored as bit(1)
            });

            it('gets a member (filtered)', async function() {
                const response = await appApi.get('/members?firstname=lewis').auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('array');
                expect(response.body).to.have.length(1);
            });

            it('handles empty members list', async function() {
                const response = await appApi.get('/members?firstname=nomatch').auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(204, response.text);
                expect(response.body).to.be.empty;
            });

            it('updates a member', async function() {
                const values = { Firstname: 'Updated', Lastname: 'User', Email: testMember };
                const response = await appApi.patch('/members/'+id).auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to add member with duplicate e-mail', async function() {
                const values = { Firstname: 'Test', Lastname: 'User', Email: testMember };
                const response = await appApi.post('/members').auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(409, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body.message).to.equal(`Duplicate entry '${testMember.slice(0, 24)}' for key 'Email'`);
            });

            it('deletes a member', async function() {
                const response = await appApi.delete('/members/'+id).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal(testMember);
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to get deleted member', async function() {
                const response = await appApi.get('/members/'+id).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(404, response.text);
                expect(response.body).to.be.an('object');
            });

            it('fails to update deleted member', async function() {
                const values = { Firstname: 'Updated', Lastname: 'User', Email: testMember };
                const response = await appApi.patch('/members/'+id).auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(404, response.text);
            });
        });
    });

    describe('misc', function() {
        it('returns 401 for non-existent resource without auth', async function() {
            const response = await appApi.get('/zzzzzz');
            expect(response.status).to.equal(401, response.text);
        });

        it('returns 404 for non-existent resource with auth', async function() {
            const response = await appApi.get('/zzzzzz').auth(jwt, { type: 'bearer' });
            expect(response.status).to.equal(404, response.text);
        });
    });
});
