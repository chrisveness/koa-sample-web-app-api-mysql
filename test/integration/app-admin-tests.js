/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Admin app integration/acceptance tests (just a few sample tests, not full coverage)            */
/*                                                                                                */
/* These tests require admin.localhost to be set in /etc/hosts.                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import supertest           from 'supertest'; // SuperAgent driven library for testing HTTP servers
import { expect }          from 'chai';      // BDD/TDD assertion library
import { JSDOM as JsDom }  from 'jsdom';     // JavaScript implementation of DOM and HTML standards
import dotenv              from 'dotenv';    // load environment variables from a .env file into process.env
dotenv.config();

import app from '../../app.js';

const testuser = process.env.TESTUSER; // must already exist in database
const testpass = process.env.TESTPASS;


const appAdmin = supertest.agent(app.listen()).host('admin.localhost');


describe(`Admin app (${app.env})`, function() {
    this.timeout(5e3); // 5 sec

    const testEmail = `test-${Date.now().toString(36)}@user.com`; // unique e-mail for concurrent tests

    before(function() {
        if (!process.env.DB_MYSQL_CONNECTION) throw new Error('No DB_MYSQL_CONNECTION available');
        if (!process.env.DB_MONGO_CONNECTION) throw new Error('No DB_MONGO_CONNECTION available');
        if (!process.env.TESTUSER) throw new Error('No TESTUSER available');
        if (!process.env.TESTPASS) throw new Error('No TESTPASS available');
    });

    describe('password reset', function() {
        let resetToken = null;

        it('sees password reset request page', async function() {
            const response = await appAdmin.get('/password/reset-request');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('input').name).to.equal('email');
        });

        it('makes password reset request', async function() {
            const response = await appAdmin.post('/password/reset-request').send({ email: testuser });
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/password/reset-request-confirm');
            resetToken = response.headers['x-reset-token'];
            expect(resetToken).to.be.a('string');
            console.info('\treset token', resetToken);
        });

        it('sees password reset request confirmation page', async function() {
            const response = await appAdmin.get('/password/reset-request-confirm');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('title').textContent).to.equal('Reset password request');
        });

        it('sees password reset page', async function() {
            const response = await appAdmin.get(`/password/reset/${resetToken}`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('input').name).to.equal('password');
        });

        it('throws out invalid token', async function() {
            const response = await appAdmin.get('/password/reset/not-a-good-token');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
        });

        it('throws out expired token', async function() {
            const [ timestamp, hash ] = resetToken.split('-');
            const expiredTimestamp = (parseInt(timestamp, 36) - 60*60*24 - 1).toString(36);
            const response = await appAdmin.get(`/password/reset/${expiredTimestamp}-${hash}`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
        });

        it('throws out token with valid timestamp but invalid hash', async function() {
            // the token is a timestamp in base36 and a hash separated by a hyphen
            const [ timestamp ] = resetToken.split('-'); // (we don't need the hash here)
            const response = await appAdmin.get(`/password/reset/${timestamp}-abcdefgh`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('p').textContent).to.equal('This password reset link is either invalid, expired, or previously used.');
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
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('title').textContent).to.equal('Reset password');
        });
    });

    describe('login', function() {
        let location = null;

        it('forbids access to members list when not logged-in', async function() {
            const response = await appAdmin.get('/members');
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/login/members');
        });

        it('has home page with login link in nav when not logged-in', async function() {
            const response = await appAdmin.get('/');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            expect(document.querySelectorAll('nav ul li').length).to.equal(2); // nav should be just '/', 'login'
        });

        it('has login page with login fields when not logged-in', async function() {
            const response = await appAdmin.get('/login');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelectorAll('input')).to.have.lengthOf(3);
        });

        it('shows e-mail/password not recognised on failed login', async function() {
            const values = { username: 'no-user-by-this-name', password: 'not-the-right-password', 'remember-me': 'on' };
            const responsePost = await appAdmin.post('/login').send(values);
            expect(responsePost.status).to.equal(302);
            expect(responsePost.headers.location).to.equal('/login');
            const responseGet = await appAdmin.get('/login');
            expect(responseGet.status).to.equal(200);
            const document = new JsDom(responseGet.text).window.document;
            expect(document.querySelector('button').nextElementSibling.textContent).to.equal('E-mail / password not recognised');
            expect(document.querySelector('input[name=username').value).to.equal('no-user-by-this-name');
        });

        it('logs in, and redirects to /', async function() {
            const values = { username: testuser, password: testpass };
            const response = await appAdmin.post('/login').send(values);
            expect(response.status).to.equal(302);
            location = response.headers.location;
            expect(location).to.equal('/');
        });

        it('shows logged in user on login page when logged-in', async function() {
            const response = await appAdmin.get('/login');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('#name').textContent).to.equal('Admin User');
        });

        it('has home page with full nav links when logged-in', async function() {
            // get from location supplied by login redirect
            const response = await appAdmin.get(location);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('title').textContent.slice(0, 14)).to.equal('Koa Sample App');
            // nav should be '/', 'members', 'teams', 'logout'
            expect(document.querySelectorAll('nav ul li').length).to.equal(4);
        });
    });

    describe('members CRUD', function() {
        let id = null;

        it('gets add new member page', async function() {
            const response = await appAdmin.get('/members/add');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('input').name).to.equal('Firstname'); // 1st input
        });

        it('fails to add new new member with bad e-mail - redirects back to same page', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: 'this is not a valid e-mail' };
            const response = await appAdmin.post('/members/add').send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members/add');
        });

        it('fails to add new new member with bad e-mail - reports error', async function() {
            const response = await appAdmin.get('/members/add');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('p.error-msg').textContent).to.equal('Error – “Email” must be an email');
            expect(document.querySelector('input[name=Email').value).to.equal('this is not a valid e-mail'); // prefills form
        });

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: testEmail };
            const response = await appAdmin.post('/members/add').send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members');
            id = response.headers['x-insert-id'];
            console.info('\t', testEmail, id);
        });

        it('lists members including test member', async function() {
            const response = await appAdmin.get('/members');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.getElementById(id).querySelector('a').textContent).to.equal('Test');
        });

        it('returns 404 for view member page with invalid id', async function() {
            const response = await appAdmin.get('/members/xxxx');
            expect(response.status).to.equal(404);
        });

        it('gets details of test member', async function() {
            const response = await appAdmin.get('/members/'+id);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal('Test User');
        });

        it('returns 404 for edit member page with invalid id', async function() {
            const response = await appAdmin.get('/members/xxxx/edit');
            expect(response.status).to.equal(404);
        });

        it('gets edit member page', async function() {
            const response = await appAdmin.get(`/members/${id}/edit`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal('Edit member');
        });

        it('edits member', async function() {
            const values = { Firstname: 'Test-bis', Lastname: 'User', Email: testEmail };
            const response = await appAdmin.post(`/members/${id}/edit`).send(values);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members');
        });

        it('sees updated details', async function() {
            const response = await appAdmin.get(`/members/${id}/edit`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('input[name=Firstname]').value).to.equal('Test-bis');
        });

        it('gets delete member page', async function() {
            const response = await appAdmin.get(`/members/${id}/delete`);
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal('Delete member');
        });

        it('deletes test member', async function() {
            const response = await appAdmin.post(`/members/${id}/delete`);
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/members');
        });
    });

    describe('teams CRUD', function() {
        // TODO: mostly echoes members CRUD
    });

    describe('ajax', function() {
        let id = null;

        it('responds (ie server running)', async function() {
            const response = await appAdmin.get('/ajax/');
            expect(response.status).to.equal(200);
            expect(response.body.resources.auth._uri).to.equal('/auth');
        });

        it('adds new member', async function() {
            const values = { Firstname: 'Test', Lastname: 'User', Email: testEmail };
            const response = await appAdmin.post('/ajax/members').send(values);
            expect(response.status).to.equal(201);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal(testEmail);
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
            expect(response.body.Email).to.equal(testEmail);
            expect(response.body.Firstname).to.equal('Test');
        });

        it('deletes test member', async function() {
            const response = await appAdmin.delete('/ajax/members/'+id);
            expect(response.status).to.equal(200);
            expect(response.body).to.be.an('object');
            expect(response.body).to.contain.keys('MemberId', 'Firstname', 'Lastname', 'Email');
            expect(response.body.Email).to.equal(testEmail);
            expect(response.body.Firstname).to.equal('Test');
        });
    });

    describe('dev', function() {
        // it('sees dev/log pages', async function() {
        //     const responseAccess = await appAdmin.get('/dev/log-access');
        //     expect(responseAccess.status).to.equal(200);
        //     // NOTE: log-error populates IP domain cache which causes subsequent unit tests to fail,
        //     // so leave out of regular tests (only helps coverage stats, really!)
        //     //const responseError = await appAdmin.get('/dev/log-error');
        //     //expect(responseError.status).to.equal(200);
        // });

        it('sees dev/nodeinfo page', async function() {
            const response = await appAdmin.get('/dev/nodeinfo');
            expect(response.status).to.equal(200);
        });
    });

    describe('misc', function() {
        it('returns 404 for non-existent page', async function() {
            const response = await appAdmin.get('/zzzzzz');
            expect(response.status).to.equal(404);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal(':(');
        });

        it('returns 404 for non-existent member', async function() {
            const response = await appAdmin.get('/members/999999');
            expect(response.status).to.equal(404);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal(':(');
        });

        it('returns 404 for non-existent ajax page', async function() {
            const response = await appAdmin.get('/ajax/zzzzzz');
            expect(response.status).to.equal(404);
            expect(response.body).to.be.an('object');
            expect(response.body).to.deep.equal({});
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
