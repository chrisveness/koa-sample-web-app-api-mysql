/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Api integration/acceptance tests (just a few sample tests, not full coverage)                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* global describe, it */

let request = require('supertest');   // SuperAgent-driven library for testing HTTP servers
let expect  = require('chai').expect; // BDD/TDD assertion library

let app     = require('../app.js');

request = request.agent(app.listen());


describe('API'+' ('+app.env+'/'+require('../config/db-'+app.env+'.json').db.database+')', function() {

    let userId = null, userPw = null;

    describe('/auth', function() {
        it('returns 401 on missing auth header', function (done) {
            request
                .get('/auth').set({ Host: 'api.localhost' })
                .expect(401, done);
        });
        it('returns 401 on unrecognised email', function (done) {
            request
                .get('/auth').set({ Host: 'api.localhost' })
                .auth('xxx@user.com', 'admin')
                .expect(401, done);
        });
        it('returns 401 on bad password', function (done) {
            request
                .get('/auth').set({ Host: 'api.localhost' })
                .auth('admin@user.com', 'bad-password')
                .expect(401, done);
        });
        it('returns auth details', function (done) {
            request
                .get('/auth').set({ Host: 'api.localhost' })
                .auth('admin@user.com', 'admin')
                .expect(200)
                .end(function(err, result) {
                    if (result.status != 200) console.log(result.body);
                    expect(result.body).to.be.an('object');
                    expect(result.body).to.contain.keys('id', 'token');
                    userId = result.body.id.toString();
                    userPw = result.body.token;
                    // console.log(userId, userPw);
                    done(err);
                });
        });
    });

    describe('/members', function() {
        describe('auth checks', function() {
            it('returns 401 on unrecognised auth id', function (done) {
                request
                    .get('/members').set({ Host: 'api.localhost' })
                    .auth('999999', 'x')
                    .expect(401)
                    .end(function(err, result) {
                        if (result.status != 401) console.log(result.text);
                        done(err);
                    });
            });
            it('returns 401 on bad auth password', function (done) {
                request
                    .get('/members').set({ Host: 'api.localhost' })
                    .auth(userId, 'bad-password')
                    .expect(401, done);
            });
            it('returns members list', function (done) {
                request
                    .get('/members').set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .expect(200)
                    .end(function(err, result) {
                        if (result.status != 200) console.log(result.status, result.text);
                        expect(result.body).to.be.an('array');
                        expect(result.body).to.have.length.above(1);
                        done(err);
                    });
            });
            it('returns xml', function (done) {
                request
                    .get('/members').set({ Host: 'api.localhost', Accept: 'application/xml' })
                    .auth(userId, userPw)
                    .expect(200)
                    .end(function(err, result) {
                        expect(result.text.slice(0, 38)).to.equal('<?xml version="1.0" encoding="UTF-8"?>');
                        done(err);
                    });
            });
        });
        describe('CRUD', function() {
            let id = null;
            it('adds a member', function (done) {
                request
                    .post('/members').set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .send({ Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' })
                    .expect(201)
                    .end(function(err, result) {
                        if (result.status != 201) console.log(result.body);
                        expect(result.body).to.be.an('object');
                        expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                        expect(result.body.Email).to.equal('test@user.com');
                        expect(result.headers.location).to.equal('/members/'+result.body.MemberId);
                        id = result.body.MemberId;
                        done(err);
                    });
            });
            it('gets a member', function (done) {
                request
                    .get('/members/'+id).set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .expect(200)
                    .end(function(err, result) {
                        if (result.status != 200) console.log(result.status, result.text);
                        expect(result.body).to.be.an('object');
                        expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                        expect(result.body.Email).to.equal('test@user.com');
                        expect(result.body.Firstname).to.equal('Test');
                        done(err);
                    });
            });
            it('gets a member (filtered)', function (done) {
                request
                    .get('/members?firstname=lewis').set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .expect(200)
                    .end(function(err, result) {
                        if (result.status != 200) console.log(result.status, result.text);
                        expect(result.body).to.be.an('array');
                        expect(result.body).to.have.length(1);
                        done(err);
                    });
            });
            it('updates a member', function (done) {
                request
                    .patch('/members/'+id).set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .send({ Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' })
                    .expect(200)
                    .end(function(err, result) {
                        if (result.status != 200) console.log(result.status, result.text);
                        expect(result.body).to.be.an('object');
                        expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                        expect(result.body.Firstname).to.equal('Updated');
                        done(err);
                    });
            });
            it('fails to add member with duplicate e-mail', function (done) {
                request
                    .post('/members').set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .send({ Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' })
                    .expect(403)
                    .end(function(err, result) {
                        if (result.status != 403) console.log(result.status, result.text);
                        expect(result.body.error).to.equal("Duplicate entry 'test@user.com' for key 'Email'");
                        done(err);
                    });
            });
            it('deletes a member', function (done) {
                request
                    .delete('/members/'+id).set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .expect(200)
                    .end(function(err, result) {
                        if (result.status != 200) console.log(result.status, result.text);
                        expect(result.body).to.be.an('object');
                        expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                        expect(result.body.Email).to.equal('test@user.com');
                        expect(result.body.Firstname).to.equal('Updated');
                        done(err);
                    });
            });
            it('fails to get deleted member', function (done) {
                request
                    .get('/members/'+id).set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .expect(404, done);
            });
            it('fails to update deleted member', function (done) {
                request
                    .patch('/members/'+id).set({ Host: 'api.localhost' })
                    .auth(userId, userPw)
                    .send({ Firstname: 'Updated', Lastname: 'User', Email: 'test@user.com' })
                    .expect(404)
                    .end(function(err, result) {
                        if (result.status != 404) console.log(result.status, result.text);
                        done(err);
                    });
            });
        });
    });

    describe('misc', function() {
        it('returns 401 for non-existent resource without auth', function(done) {
            request
                .get('/zzzzzz').set({ Host: 'api.localhost' })
                .expect(401)
                .end(function(err, result) {
                    if (result.status != 401) console.log(result.status, result.text);
                    done(err);
                });
        });
        it('returns 404 for non-existent resource with auth', function(done) {
            request
                .get('/zzzzzz').set({ Host: 'api.localhost' })
                .auth(userId, userPw)
                .expect(404)
                .end(function(err, result) {
                    if (result.status != 404) console.log(result.status, result.text);
                    done(err);
                });
        });
    });
});
