/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Api integration/acceptance tests (just a few sample tests, not full coverage)                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* eslint no-console: 0 */
/* eslint no-unused-expressions:0 */ /* (for expect().to.be.empty ) */

let supertest = require('co-supertest'); // SuperAgent-driven library for testing HTTP servers
let expect    = require('chai').expect;  // BDD/TDD assertion library
require('co-mocha');                     // enable support for generators in mocha tests using co

let app = require('../app.js');

let request = supertest.agent(app.listen());

let headers = { Host: 'api.localhost' }; // set host header


describe('API'+' ('+app.env+'/'+require('../config/db-'+app.env+'.json').db.database+')', function() {
    let userId = null, userPw = null;

    describe('/auth', function() {
        it('returns 401 on missing auth header', function*() {
            let response = yield request.get('/auth').set(headers).end();
            expect(response.status).to.equal(401, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns 401 on unrecognised email', function*() {
            let response = yield request.get('/auth').set(headers).auth('xxx@user.com', 'admin').end();
            expect(response.status).to.equal(401, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns 401 on bad password', function*() {
            let response = yield request.get('/auth').set(headers).auth('admin@user.com', 'bad-password').end();
            expect(response.status).to.equal(401, response.text);
            expect(response.body).to.be.an('object');
        });

        it('returns auth details', function*() {
            let response = yield request.get('/auth').set(headers).auth('admin@user.com', 'admin').end();
            expect(response.status).to.equal(200, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('id', 'token');
            userId = response.body.id.toString();
            userPw = response.body.token;
            // console.log(userId, userPw);
        });
    });

    describe('/members', function() {
        describe('auth checks', function() {
            it('returns 401 on unrecognised auth id', function*() {
                let response = yield request.get('/members').set(headers).auth('999999', 'x').end();
                expect(response.status).to.equal(401, response.text);
            });

            it('returns 401 on bad auth password', function*() {
                let response = yield request.get('/members').set(headers).auth(userId, 'bad-password').end();
                expect(response.status).to.equal(401, response.text);
                expect(response.body).to.be.an('object');
            });

            it('returns members list', function*() {
                let response = yield request.get('/members').set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('array');
                expect(response.body).to.have.length.above(1);
            });

            it('returns xml', function*() {
                let hdrs = { Host: 'api.localhost', Accept: 'application/xml' }; // set host & accepts headers
                let response = yield request.get('/members').set(hdrs).auth(userId, userPw).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.text.slice(0, 38)).to.equal('<?xml version="1.0" encoding="UTF-8"?>');
            });
        });
        describe('CRUD', function() {
            let id = null;
            it('adds a member', function*() {
                let values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
                let response = yield request.post('/members').set(headers).auth(userId, userPw).send(values).end();
                expect(response.status).to.equal(201, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.headers.location).to.equal('/members/'+response.body.MemberId);
                id = response.body.MemberId;
            });

            it('gets a member', function*() {
                let response = yield request.get('/members/'+id).set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.body.Firstname).to.equal('Test');
            });

            it('gets a member (filtered)', function*() {
                let response = yield request.get('/members?firstname=lewis').set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('array');
                expect(response.body).to.have.length(1);
            });

            it('handles empty members list', function*() {
                let response = yield request.get('/members?firstname=nomatch').set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(204, response.text);
                expect(response.body).to.be.empty;
            });

            it('updates a member', function*() {
                let values = { Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' };
                let response = yield request.patch('/members/'+id).set(headers).auth(userId, userPw).send(values).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to add member with duplicate e-mail', function*() {
                let values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
                let response = yield request.post('/members').set(headers).auth(userId, userPw).send(values).end();
                expect(response.status).to.equal(409, response.text);
                expect(response.body.error).to.equal("Duplicate entry 'test@user.com' for key 'Email'");
            });

            it('deletes a member', function*() {
                let response = yield request.delete('/members/'+id).set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(200, response.text);
                expect(response.body).to.be.an('object');
                expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                expect(response.body.Email).to.equal('test@user.com');
                expect(response.body.Firstname).to.equal('Updated');
            });

            it('fails to get deleted member', function*() {
                let response = yield request.get('/members/'+id).set(headers).auth(userId, userPw).end();
                expect(response.status).to.equal(404, response.text);
                expect(response.body).to.be.an('object');
            });

            it('fails to update deleted member', function*() {
                let values = { Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' };
                let response = yield request.patch('/members/'+id).set(headers).auth(userId, userPw).send(values).end();
                expect(response.status).to.equal(404, response.text);
            });
        });
    });

    describe('misc', function() {
        it('returns 401 for non-existent resource without auth', function*() {
            let response = yield request.get('/zzzzzz').set(headers).end();
            expect(response.status).to.equal(401, response.text);
        });

        it('returns 404 for non-existent resource with auth', function*() {
            let response = yield request.get('/zzzzzz').set(headers).auth(userId, userPw).end();
            expect(response.status).to.equal(404, response.text);
        });
    });
});
