/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Web-app integration/acceptance tests (just a few sample tests, not full coverage)              */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const supertest = require('supertest');   // SuperAgent driven library for testing HTTP servers
const expect    = require('chai').expect; // BDD/TDD assertion library
const jsdom     = require('jsdom').jsdom; // JavaScript implementation of DOM and HTML standards
require('mocha');                         // simple, flexible, fun test framework

const app = require('../app.js');


const request = supertest.agent(app.listen());

const headers = { Host: 'admin.localhost:3000' }; // set host header

describe('Admin app'+' ('+app.env+'/'+process.env.DB_DATABASE+')', function() {

    describe('login', function() {
        let location = null;

        it('has home page with login link in nav when not logged-in', async function() {
            const response = await request.get('/').set(headers);
            expect(response.status).to.equal(200, response.text);
            const doc = jsdom(response.text);
            expect(doc.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            expect(doc.querySelectorAll('nav ul li').length).to.equal(2); // nav should be just '/', 'login'
        });

        it('redirects to / on login', async function() {
            const values = { username: 'admin@user.com', password: 'admin' };
            const response = await request.post('/login').set(headers).send(values);
            expect(response.status).to.equal(302, response.text);
            location = response.headers.location;
            expect(location).to.equal('/');
        });

        it('has home page with full nav links when logged-in', async function() {
            // get from location supplied by login
            const response = await request.get(location).set(headers);
            expect(response.status).to.equal(200, response.text);
            const doc = jsdom(response.text);
            expect(doc.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            expect(doc.querySelectorAll('nav ul li').length).to.equal(4); // nav should be '/', 'members', 'teams', 'logout'
        });
    });

    describe('CRUD', function() {
        let id = null;

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = await request.post('/members/add').set(headers).send(values);
            expect(response.status).to.equal(302, response.text);
            expect(response.headers.location).to.equal('/members');
            id = response.headers['x-insert-id'];
        });

        it('lists members including test member', async function() {
            const response = await request.get('/members').set(headers);
            expect(response.status).to.equal(200, response.text);
            const doc = jsdom(response.text);
            expect(doc.getElementById(id).querySelector('a').textContent).to.equal('Test');
        });

        it('gets details of test member', async function() {
            const response = await request.get('/members/'+id).set(headers);
            expect(response.status).to.equal(200, response.text);
            const doc = jsdom(response.text);
            expect(doc.querySelector('h1').textContent).to.equal('Test User');
        });

        it('deletes test member', async function() {
            const response = await request.post('/members/'+id+'/delete').set(headers);
            expect(response.status).to.equal(302, response.text);
            expect(response.headers.location).to.equal('/members');
        });
    });

    describe('ajax', function() { // NOTE THIS REQUIRES THE APP TO BE STARTED TO ACCESS THE API
        let id = null;

        it('responds (ie server running)', async function() {
            const response = await request.get('/ajax/').set(headers);
            expect(response.status).to.equal(200, response.text);
            expect(response.body.resources.auth._uri).to.equal('/auth');
        });

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = await request.post('/ajax/members').set(headers).send(values);
            expect(response.status).to.equal(201, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            id = response.body.MemberId;
        });

        it('lists members including test member', async function() {
            const response = await request.get('/ajax/members').set(headers);
            expect(response.status).to.equal(200, response.text);
            expect(response.body).to.be.an('array');
            expect(response.body).to.have.length.above(1);
        });

        it('gets details of test member', async function() {
            const response = await request.get('/ajax/members/'+id).set(headers);
            expect(response.status).to.equal(200, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });

        it('deletes test member', async function() {
            const response = await request.delete('/ajax/members/'+id).set(headers);
            expect(response.status).to.equal(200, response.text);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });
    });

    describe('misc', function() {
        it('returns 404 for non-existent page', async function() {
            const response = await request.get('/zzzzzz').set(headers);
            expect(response.status).to.equal(404, response.text);
            const doc = jsdom(response.text);
            expect(doc.querySelector('h1').textContent).to.equal(':(');
        });

        it('returns 404 for non-existent member', async function() {
            const response = await request.get('/members/999999').set(headers);
            expect(response.status).to.equal(404, response.text);
            const doc = jsdom(response.text);
            expect(doc.querySelector('h1').textContent).to.equal(':(');
        });
    });

    describe('logout', function() {
        it('logs out and redirects to /', async function() {
            const response = await request.get('/logout').set(headers);
            expect(response.status).to.equal(302, response.text);
            expect(response.headers.location).to.equal('/');
        });
    });
});
