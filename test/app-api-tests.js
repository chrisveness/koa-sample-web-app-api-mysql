/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Api app integration/acceptance tests (just a few sample tests, not full coverage)              */
/*                                                                                                */
/* These tests require api.localhost to be set in /etc/hosts.                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const supertest = require('supertest');   // SuperAgent driven library for testing HTTP servers
const expect    = require('chai').expect; // BDD/TDD assertion library
require('mocha');                         // simple, flexible, fun test framework

const app = require('../app.js');

const testuser = process.env.TESTUSER;
const testpass = process.env.TESTPASS;


const appApi = supertest.agent(app.listen()).host('api.localhost');


describe(`API app (${app.env})`, function() {
    let jwt = null;

    describe('/auth', function() {
        it('returns 404 on unrecognised email', async function() {
            const response = await appApi.get('/auth').query({ username: 'xxx@user.com', password: testpass });
            expect(response.status).to.equal(404, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns 404 on bad password', async function() {
            const response = await appApi.get('/auth').query({ username: testuser, password: 'bad-password' });
            expect(response.status).to.equal(404, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns auth details', async function() {
            const response = await appApi.get('/auth').query({ username: testuser, password: testpass });
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
                const response = await appApi.get('/members').auth(testuser, testpass);
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
                const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com', Active: 'true' };
                const response = await appApi.post('/members').auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(201, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.headers.location).to.equal('/members/'+response.body.MemberId);
                id = response.body.MemberId;
            });

            it('gets a member (json)', async function() {
                const response = await appApi.get('/members/'+id).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.body.Firstname).to.equal('Test');
                expect(response.body.Active).to.be.true;
            });

            it('gets a member (xml)', async function() {
                const hdrs = { Host: 'api.localhost', Accept: 'application/xml' }; // set host & accepts headers
                const response = await appApi.get('/members/'+id).set(hdrs).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.text.slice(0, 38)).to.equal('<?xml version="1.0" encoding="UTF-8"?>');
                expect(response.text.match(/<Email>(.*)<\/Email>/)[1]).to.equal('test@user.com');
                expect(response.text.match(/<Firstname>(.*)<\/Firstname>/)[1]).to.equal('Test');
                expect(response.text.match(/<Active>(.*)<\/Active>/)[1]).to.equal('true');
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
                const values = { Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' };
                const response = await appApi.patch('/members/'+id).auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to add member with duplicate e-mail', async function() {
                const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
                const response = await appApi.post('/members').auth(jwt, { type: 'bearer' }).send(values);
                expect(response.status).to.equal(409, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body.message).to.equal("Duplicate entry 'test@user.com' for key 'Email'");
            });

            it('deletes a member', async function() {
                const response = await appApi.delete('/members/'+id).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to get deleted member', async function() {
                const response = await appApi.get('/members/'+id).auth(jwt, { type: 'bearer' });
                expect(response.status).to.equal(404, response.text);
                expect(response.body).to.be.an('object');
            });

            it('fails to update deleted member', async function() {
                const values = { Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' };
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
