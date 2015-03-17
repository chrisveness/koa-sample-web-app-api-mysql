/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Web-app integration/acceptance tests (just a few sample tests, not full coverage)              */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* global describe, it */

let request = require('supertest');   // SuperAgent-driven library for testing HTTP servers
let expect  = require('chai').expect; // BDD/TDD assertion library
let cheerio = require('cheerio');     // core jQuery for the server

let app = require('../app.js');

request = request.agent(app.listen());

describe('Admin app'+' ('+app.env+'/'+require('../config/db-'+app.env+'.json').db.database+')', function() {

    describe('login', function() {
        let location = null;
        it('has home page with login link in nav when not logged-in', function(done) {
            request
                .get('/').set({ Host: 'admin.localhost' })
                .expect(200)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('title').html().slice(0, 14)).to.equal('Koa Sample App');
                    expect($('nav ul li').length).to.equal(2); // nav should be just '/', 'login'
                    done(err);
                });
        });
        it('redirects to / on login', function(done) {
            request
                .post('/login').set({ Host: 'admin.localhost' })
                .send({ username: 'admin@user.com', password: 'admin' })
                .expect(302)
                .end(function(err, result) {
                    location = result.headers.location;
                    expect(location).to.equal('/');
                    done(err);
                });
        });
        it('has home page with full nav links when logged-in', function(done) {
            request
                // get from location supplied by login
                .get(location).set({ Host: 'admin.localhost' })
                .expect(200)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('title').html().slice(0, 14)).to.equal('Koa Sample App');
                    expect($('nav ul li').length).to.equal(4); // nav should be '/', 'members', 'teams', 'logout'
                    done(err);
                });
        });
    });

    describe('CRUD', function() {
        let id = null;
        it('adds new member', function(done) {
            request
                .post('/members/add').set({ Host: 'admin.localhost' })
                .send({ Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' })
                .expect(302)
                .end(function(err, result) {
                    expect(result.headers.location).to.equal('/members');
                    id = result.headers['x-insert-id'];
                    done(err);
                });
        });
        it('lists members including test member', function(done) {
            request
                .get('/members').set({ Host: 'admin.localhost' })
                .expect(200)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('#'+id+' a').html()).to.equal('Test');
                    done(err);
                });
        });
        it('gets details of test member', function(done) {
            request
                .get('/members/'+id).set({ Host: 'admin.localhost' })
                .expect(200)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('h1').html()).to.equal('Test User');
                    done(err);
                });
        });
        it('deletes test member', function(done) {
            request
                .post('/members/'+id+'/delete').set({ Host: 'admin.localhost' })
                .expect(302)
                .end(function(err, result) {
                    if (err) throw err;
                    expect(result.headers.location).to.equal('/members');
                    done(err);
                });
        });
    });

    describe('ajax', function() {
        let id = null;
        it('responds (ie server running)', function(done) {
            request
                .get('/ajax/').set({ Host: 'admin.localhost:3000' })
                .expect(200, done);
        });
        it('adds new member', function(done) {
            request
                .post('/ajax/members').set({ Host: 'admin.localhost:3000' })
                .send({ Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' })
                .expect(201)
                .end(function(err, result) {
                    //if (result.status != 201) console.log(result.status, result.text);
                    expect(result.body).to.be.an('object');
                    expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                    expect(result.body.Email).to.equal('test@user.com');
                    id = result.body.MemberId;
                    done(err);
                });
        });
        it('lists members including test member', function(done) {
            request
                .get('/ajax/members').set({ Host: 'admin.localhost:3000' })
                .expect(200)
                .end(function(err, result) {
                    //if (result.status != 200) console.log(result.status, result.text);
                    expect(result.body).to.be.an('array');
                    expect(result.body).to.have.length.above(1);
                    done(err);
                });
        });
        it('gets details of test member', function(done) {
            request
                .get('/ajax/members/'+id).set({ Host: 'admin.localhost:3000' })
                .expect(200)
                .end(function(err, result) {
                    //if (result.status != 200) console.log(result.status, result.text);
                    expect(result.body).to.be.an('object');
                    expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                    expect(result.body.Email).to.equal('test@user.com');
                    expect(result.body.Firstname).to.equal('Test');
                    done(err);
                });
        });
        it('deletes test member', function(done) {
            request
                .delete('/ajax/members/'+id).set({ Host: 'admin.localhost:3000' })
                .expect(200)
                .end(function(err, result) {
                    //if (result.status != 200) console.log(result.status, result.text);
                    expect(result.body).to.be.an('object');
                    expect(result.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
                    expect(result.body.Email).to.equal('test@user.com');
                    expect(result.body.Firstname).to.equal('Test');
                    done(err);
                });
        });
    });

    describe('misc', function() {
        it('returns 404 for non-existent page', function(done) {
            request
                // get from location supplied by login
                .get('/zzzzzz').set({ Host: 'admin.localhost' })
                .expect(404)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('h1').html()).to.equal(':(');
                    done(err);
                });
        });
        it('returns 404 for non-existent member', function(done) {
            request
                // get from location supplied by login
                .get('/members/999999').set({ Host: 'admin.localhost' })
                .expect(404)
                .end(function(err, result) {
                    let $ = cheerio.load(result.text);
                    expect($('h1').html()).to.equal(':(');
                    done(err);
                });
        });
    });

    describe('logout', function() {
        it('logs out and redirects to /', function(done) {
            request
                // get from location supplied by login
                .get('/logout').set({ Host: 'admin.localhost' })
                .expect(302)
                .end(function(err, result) {
                    expect(result.headers.location).to.equal('/');
                    done(err);
                });
        });
    });
});
