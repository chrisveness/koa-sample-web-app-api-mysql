/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* WWW app integration/acceptance tests (just a few sample tests, not full coverage)              */
/*                                                                                                */
/* These tests require www.localhost to be set in /etc/hosts.                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import supertest          from 'supertest';  // SuperAgent driven library for testing HTTP servers
import { expect }         from 'chai';       // BDD/TDD assertion library
import jsdom from 'jsdom'; const JsDom = jsdom.JSDOM; // JavaScript implementation of DOM and HTML standards TODO: named export not yet available

import app  from '../../app.js';

const appAdmin = supertest.agent(app.listen()).host('www.localhost');


describe(`WWW app (${app.env})`, function() {
    describe('basic tests', function() {
        it('sees home page', async function() {
            const response = await appAdmin.get('/');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal('Koa Sample App (handlebars templating + RESTful API using MySQL, on Node.js)');
        });

        it('sees contact page', async function() {
            const response = await appAdmin.get('/contact');
            expect(response.status).to.equal(200);
            const document = new JsDom(response.text).window.document;
            expect(document.querySelector('h1').textContent).to.equal('Koa Sample App contact page');
        });

        it('submits contact page', async function() {
            const response = await appAdmin.post('/contact').send({ email: 'user@example.com', message: 'Hi there' });
            expect(response.status).to.equal(302);
            expect(response.headers.location).to.equal('/contact');
        });
    });
});
