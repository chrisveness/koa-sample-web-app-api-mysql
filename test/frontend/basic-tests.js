/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TestCafé front-end integration tests - basic example.                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* global fixture, window */

import { Selector, ClientFunction } from 'testcafe';   // automated end-to-end web testing
import Scrypt                       from 'scrypt-kdf'; // scrypt key derivation function
import dotenv                       from 'dotenv';     // load environment variables from a .env file into process.env
dotenv.config(); // for db connection

import User from '../../models/user.js';

const path = ClientFunction(() => window.location.pathname);


fixture('basic-frontend-tests')
    .page('http://admin.localhost:3000/login')
    .beforeEach(async t => {
        t.ctx.admin = {
            username: `testmeister-${Date.now().toString(36)}@example.net`,
            password: Math.random().toString(16).slice(2),
        };
        t.ctx.member = {
            firstname: `TestCafé-${Date.now().toString(36)}`,
            lastname:  'Member',
            email:     `testcafe-${Date.now().toString(36)}@example.net`,
        };
        t.ctx.admin.userId = await User.insert({
            Firstname: 'Test',
            Lastname:  'Meister',
            Email:     t.ctx.admin.username,
            Password:  (await Scrypt.kdf(t.ctx.admin.password, { logN: 15 })).toString('base64'),
            Role:      'admin',
        });
        console.info({ admin: t.ctx.admin.username }, { member: t.ctx.member.email });
    })
    .afterEach(async t => {
        await User.delete(t.ctx.admin.userId);
    });

test('Adds & deletes a member', async t => {
    await t // login
        .typeText('input[name=username]', t.ctx.admin.username)
        .typeText('input[name=password]', t.ctx.admin.password)
        .click('button')
        .expect(path()).eql('/')
        .click('nav a[href="/members"]')
        .expect(path()).eql('/members');

    await t // add member
        .click('a[title="add member"]')
        .expect(path()).eql('/members/add')
        .typeText('input[name=Firstname]', t.ctx.member.firstname)
        .typeText('input[name=Lastname]', t.ctx.member.lastname)
        .typeText('input[name=Email]', t.ctx.member.email)
        .click('button[title=Add]')
        .expect(path()).eql('/members');

    await t // delete member
        .click(Selector('td').withText(t.ctx.member.firstname).parent('tr').find('a[title="delete member"]'))
        .expect(path()).match(/\/members\/[0-9]+\/delete/)
        .click('button')
        .expect(path()).eql('/members');

    await t // logout
        .click('nav a[href="/logout"]')
        .expect(path()).eql('/');
});
