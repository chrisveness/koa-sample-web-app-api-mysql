/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Web-app integration/acceptance tests (just a few sample tests, not full coverage)              */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const supertest = require('co-supertest'); // SuperAgent-driven library for testing HTTP servers
const expect    = require('chai').expect;  // BDD/TDD assertion library
const cheerio   = require('cheerio');      // core jQuery for the server
require('co-mocha');                     // enable support for generators in mocha tests using co

const app = require('../app.js');

const request = supertest.agent(app.listen());

const headers = { Host: 'admin.localhost:3000' }; // set host header

describe('Admin app'+' ('+app.env+'/'+require('../config/db-'+app.env+'.json').db.database+')', function() {

    describe('login', function() {
        let location = null;

        it('has home page with login link in nav when not logged-in', function*() {
            const response = yield request.get('/').set(headers).expect(200).end();
            const $ = cheerio.load(response.text);
            expect($('title').html().slice(0, 14)).to.equal('Koa Sample App');
            expect($('nav ul li').length).to.equal(2); // nav should be just '/', 'login'
        });

        it('redirects to / on login', function*() {
            const values = { username: 'admin@user.com', password: 'admin' };
            const response = yield request.post('/login').set(headers).send(values).expect(302).end();
            location = response.headers.location;
            expect(location).to.equal('/');
        });

        it('has home page with full nav links when logged-in', function*() {
            // get from location supplied by login
            const response = yield request.get(location).set(headers).expect(200).end();
            const $ = cheerio.load(response.text);
            expect($('title').html().slice(0, 14)).to.equal('Koa Sample App');
            expect($('nav ul li').length).to.equal(4); // nav should be '/', 'members', 'teams', 'logout'
        });
    });

    describe('CRUD', function() {
        let id = null;

        it('adds new member', function*() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = yield request.post('/members/add').set(headers).send(values).expect(302).end();
            expect(response.headers.location).to.equal('/members');
            id = response.headers['x-insert-id'];
        });

        it('lists members including test member', function*() {
            const response = yield request.get('/members').set(headers).expect(200).end();
            const $ = cheerio.load(response.text);
            expect($('#'+id+' a').html()).to.equal('Test');
        });

        it('gets details of test member', function*() {
            const response = yield request.get('/members/'+id).set(headers).expect(200).end();
            const $ = cheerio.load(response.text);
            expect($('h1').html()).to.equal('Test User');
        });

        it('deletes test member', function*() {
            const response = yield request.post('/members/'+id+'/delete').set(headers).expect(302).end();
            expect(response.headers.location).to.equal('/members');
        });
    });

    describe('ajax', function() {
        let id = null;

        it('responds (ie server running)', function*() {
            const response = yield request.get('/ajax/').set(headers).expect(200).end();
            expect(response.body.resources.auth._uri).to.equal('/auth');
        });

        it('adds new member', function*() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = yield request.post('/ajax/members').set(headers).send(values).expect(201).end();
            //if (response.status != 201) console.log(response.status, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            id = response.body.MemberId;
        });

        it('lists members including test member', function*() {
            const response = yield request.get('/ajax/members').set(headers).expect(200).end();
            //if (response.status != 200) console.log(response.status, response.text);
            expect(response.body).to.be.an('array');
            expect(response.body).to.have.length.above(1);
        });

        it('gets details of test member', function*() {
            const response = yield request.get('/ajax/members/'+id).set(headers).expect(200).end();
            //if (response.status != 200) console.log(response.status, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });

        it('deletes test member', function*() {
            const response = yield request.delete('/ajax/members/'+id).set(headers).expect(200).end();
            //if (response.status != 200) console.log(response.status, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });
    });

    describe('misc', function() {
        it('returns 404 for non-existent page', function*() {
            const response = yield request.get('/zzzzzz').set(headers).expect(404).end();
            const $ = cheerio.load(response.text);
            expect($('h1').html()).to.equal(':(');
        });

        it('returns 404 for non-existent member', function*() {
            const response = yield request.get('/members/999999').set(headers).expect(404).end();
            const $ = cheerio.load(response.text);
            expect($('h1').html()).to.equal(':(');
        });
    });

    describe('logout', function() {
        it('logs out and redirects to /', function*() {
            const response = yield request.get('/logout').set(headers).expect(302).end();
            expect(response.headers.location).to.equal('/');
        });
    });
});
