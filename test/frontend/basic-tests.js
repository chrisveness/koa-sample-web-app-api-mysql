/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TestCafé front-end integration tests - basic example.                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* global fixture, window */

import { Selector, ClientFunction } from 'testcafe'; // automated end-to-end web testing
import dotenv                       from 'dotenv';   // load environment variables from a .env file into process.env
dotenv.config(); // for db connection

import Page from './page-model.js';

const path = ClientFunction(() => window.location.pathname);

/**
 * Return details for user to be added.
 */
function initMember(t) {
    const member =  {
        firstname: `TestCafé-${Date.now().toString(36)}`,
        lastname:  'Member',
        email:     `testcafe-${Date.now().toString(36)}@example.net`,
    };
    console.info('\tmember:', member.email, `(${t.testRun.browserConnection.browserInfo.alias})`);
    return member;
}

/**
 * Return details for team to be added.
 */
function initTeam(t) {
    const team =  {
        name: `TestCafé-${Date.now().toString(36)}`,
    };
    console.info('\tteam:', team.name, `(${t.testRun.browserConnection.browserInfo.alias})`);
    return team;
}


fixture('basic-frontend-tests')
    .page('http://admin.localhost:3000/login')
    .before(async ctx => {
        await Page.createAdmin(ctx);
    })
    .after(async ctx => {
        await Page.deleteAdmin(ctx);
    });

test.before(t => t.ctx.member = initMember(t))('Adds & deletes a member', async t => {
    await Page.login();

    await t // members list
        .click('nav a[href="/members"]')
        .expect(path()).eql('/members');

    await t // add member
        .click('a[title="add member"]')
        .expect(path()).eql('/members/add')
        .typeText('input[name=Firstname]', t.ctx.member.firstname)
        .typeText('input[name=Lastname]', t.ctx.member.lastname)
        .typeText('input[name=Email]', t.ctx.member.email)
        .click('button[title=Add]')
        .expect(path()).eql('/members')
        .expect(Selector('td').withText(t.ctx.member.firstname).exists).ok()
        .expect(Selector('td').withText(t.ctx.member.firstname).nextSibling().textContent).eql(t.ctx.member.lastname);

    await t // delete member
        .click(Selector('td').withText(t.ctx.member.firstname).parent('tr').find('a[title="delete member"]'))
        .expect(path()).match(/\/members\/[0-9]+\/delete/)
        .click('button')
        .expect(path()).eql('/members');

    await Page.logout();
});

test.before(t => t.ctx.team = initTeam(t))('Adds & deletes a team', async t => {
    await Page.login();

    await t // teams list
        .click('nav a[href="/teams"]')
        .expect(path()).eql('/teams');

    await t // add team
        .click('a[title="add team"]')
        .expect(path()).eql('/teams/add')
        .typeText('input[name=Name]', t.ctx.team.name)
        .click('button[title=Add]')
        .expect(path()).eql('/teams')
        .expect(Selector('td').withText(t.ctx.team.name).exists).ok();

    await t // delete team
        .click(Selector('td').withText(t.ctx.team.name).parent('tr').find('a[title="delete team"]'))
        .expect(path()).match(/\/teams\/[0-9]+\/delete/)
        .click('button')
        .expect(path()).eql('/teams');

    await Page.logout();
});
