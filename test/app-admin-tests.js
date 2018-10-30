/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin app integration/acceptance tests (just a few sample tests, not full coverage)            */
/*                                                                                                */
/* These tests require admin.localhost to be set in /etc/hosts.                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const supertest = require('supertest');   // SuperAgent driven library for testing HTTP servers
const expect    = require('chai').expect; // BDD/TDD assertion library
const JSDOM     = require('jsdom').JSDOM; // JavaScript implementation of DOM and HTML standards
const dotenv    = require('dotenv');      // load environment variables from a .env file into process.env
dotenv.config();

const app = require('../app.js');

const testuser = process.env.TESTUSER;
const testpass = process.env.TESTPASS;


const appAdmin = supertest.agent(app.listen()).host('admin.localhost');


describe(`Admin app (${app.env})`, function() {
    this.timeout(5e3); // 5 sec

    describe('password reset', function() {
        let resetToken = null;

        it('sees password reset request page', async function() {
            const response = await appAdmin.get('/password/reset-request');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('input').name).to.equal('email');
        });

        it('makes password reset request', async function() {
            const response = await appAdmin.post('/password/reset-request').send({ email: testuser });
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/password/reset-request-confirm');
            console.info('\tsendmail response', response.headers['x-sendmail-response']);
            resetToken = response.headers['x-reset-token'];
            console.info('\treset token', resetToken);
            // any way to test e-mail gets sent?
        });

        it('sees password reset request confirmation page', async function() {
            const response = await appAdmin.get('/password/reset-request-confirm');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('title').textContent).to.equal('Reset password request');
        });

        it('sees password reset page', async function() {
            const response = await appAdmin.get(`/password/reset/${resetToken}`);
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('input').name).to.equal('password');
        });

        it('throws out invalid token', async function() {
            const response = await appAdmin.get('/password/reset/not-a-good-token');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
        });

        it('throws out expired token', async function() {
            const [ timestamp, hash ] = resetToken.split('-');
            const expiredTimestamp = (parseInt(timestamp, 36) - 60*60*24 - 1).toString(36);
            const response = await appAdmin.get(`/password/reset/${expiredTimestamp}-${hash}`);
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
        });

        it('throws out token with valid timestamp but invalid hash', async function() {
            // the token is a timestamp in base36 and a hash separated by a hyphen
            const [ timestamp ] = resetToken.split('-'); // (we don't need the hash here)
            const response = await appAdmin.get(`/password/reset/${timestamp}-abcdefgh`);
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
        });

        it('chokes on different passwords', async function() {
            const values = { password: testpass, passwordConfirm: 'definitely-no-the-correct-password' };
            const response = await appAdmin.post(`/password/reset/${resetToken}`).send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal(`/password/reset/${resetToken}`);
        });

        it('resets password', async function() {
            const values = { password: testpass, passwordConfirm: testpass };
            const response = await appAdmin.post(`/password/reset/${resetToken}`).send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/password/reset/confirm');
        });

        it('sees password reset confirmation page', async function() {
            const response = await appAdmin.get('/password/reset/confirm');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('title').textContent).to.equal('Reset password');
        });
    });

    describe('login', function() {
        let location = null;

        it('has home page with login link in nav when not logged-in', async function() {
            const response = await appAdmin.get('/');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            expect(doc.querySelectorAll('nav ul li').length).to.equal(2); // nav should be just '/', 'login'
        });

        it('redirects to / on login', async function() {
            const values = { username: 'admin@user.com', password: 'admin' };
            const response = await appAdmin.post('/login').send(values);
            expect(response.status).to.equal(302);
            location = response.headers.location;
            expect(location).to.equal('/');
        });

        it('has home page with full nav links when logged-in', async function() {
            // get from location supplied by login
            const response = await appAdmin.get(location);
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            expect(doc.querySelectorAll('nav ul li').length).to.equal(4); // nav should be '/', 'members', 'teams', 'logout'
        });
    });

    describe('CRUD', function() {
        let id = null;

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = await appAdmin.post('/members/add').send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members');
            id = response.headers['x-insert-id'];
        });

        it('lists members including test member', async function() {
            const response = await appAdmin.get('/members');
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.getElementById(id).querySelector('a').textContent).to.equal('Test');
        });

        it('gets details of test member', async function() {
            const response = await appAdmin.get('/members/'+id);
            expect(response.status).to.equal(200);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('h1').textContent).to.equal('Test User');
        });

        it('deletes test member', async function() {
            const response = await appAdmin.post('/members/'+id+'/delete');
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members');
        });
    });

    describe('ajax', function() { // NOTE THIS REQUIRES THE APP TO BE STARTED TO ACCESS THE API
        let id = null;

        it('responds (ie server running)', async function() {
            const response = await appAdmin.get('/ajax/');
            expect(response.status).to.equal(200);
            expect(response.body.resources.auth._uri).to.equal('/auth');
        });

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'test@user.com' };
            const response = await appAdmin.post('/ajax/members').send(values);
            expect(response.status).to.equal(201);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            id = response.body.MemberId;
        });

        it('lists members including test member', async function() {
            const response = await appAdmin.get('/ajax/members');
            expect(response.status).to.equal(200);
            expect(response.body).to.be.an('array');
            expect(response.body).to.have.length.above(1);
        });

        it('gets details of test member', async function() {
            const response = await appAdmin.get('/ajax/members/'+id);
            expect(response.status).to.equal(200);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });

        it('deletes test member', async function() {
            const response = await appAdmin.delete('/ajax/members/'+id);
            expect(response.status).to.equal(200);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal('test@user.com');
            expect(response.body.Firstname).to.equal('Test');
        });
    });

    describe('misc', function() {
        it('returns 404 for non-existent page', async function() {
            const response = await appAdmin.get('/zzzzzz');
            expect(response.status).to.equal(404);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('h1').textContent).to.equal(':(');
        });

        it('returns 404 for non-existent member', async function() {
            const response = await appAdmin.get('/members/999999');
            expect(response.status).to.equal(404);
            const doc = new JSDOM(response.text).window.document;
            expect(doc.querySelector('h1').textContent).to.equal(':(');
        });
    });

    describe('logout', function() {
        it('logs out and redirects to /', async function() {
            const response = await appAdmin.get('/logout');
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/');
        });
    });
});
