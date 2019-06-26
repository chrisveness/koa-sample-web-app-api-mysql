/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Testcafé front-end integration tests - basic example.                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* global fixture, window */

import { Selector, ClientFunction } from 'testcafe';

import dotenv from 'dotenv';
dotenv.config();

const testUser = process.env.TESTUSER;
const testPass = process.env.TESTPASS;

const member = {
    firstname: `Testcafé-${Math.random().toString(36)}`,
    lastname:  'Member',
    email:     `testcafe-${Math.random().toString(36)}@example.net`,
};

const path = ClientFunction(() => window.location.pathname);

fixture('basic-frontend-tests')
    .page('http://admin.localhost:3000/login');

test('Adds & deletes a member', async t => {
    await t
        .typeText('input[name=username]', testUser)
        .typeText('input[name=password]', testPass)
        .click('button')
        .expect(path()).eql('/')
        .click('nav a[href="/members"]')
        .expect(path()).eql('/members')
        .click('a[title="add member"]')
        .expect(path()).eql('/members/add')
        .typeText('input[name=Firstname]', member.firstname)
        .typeText('input[name=Lastname]', member.lastname)
        .typeText('input[name=Email]', member.email)
        .click('button[title=Add]')
        .expect(path()).eql('/members')
        .click(Selector('td').withText(member.firstname).parent('tr').find('a[title="delete member"]'))
        .expect(path()).match(/\/members\/[0-9]+\/delete/)
        .click('button')
        .expect(path()).eql('/members')
        .click('nav a[href="/logout"]')
        .expect(path()).eql('/');
});
