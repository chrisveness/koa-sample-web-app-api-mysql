/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TestCafé page model (martinfowler.com/bliki/PageObject.html).                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* global window */

import { ClientFunction, t } from 'testcafe';   // automated end-to-end web testing
import Scrypt                from 'scrypt-kdf'; // scrypt key derivation function

import User from '../../models/user.js';

const path = ClientFunction(() => window.location.pathname);


class Page {

    /**
     * Create temporary admin user to provide login account; this means tests don't depend on an
     * existing account.
     */
    static async createAdmin(ctx) {
        ctx.admin = {
            username: `testmeister-${Date.now().toString(36)}@example.net`,
            password: Math.random().toString(16).slice(2),
        };
        ctx.admin.userId = await User.insert({
            Firstname: 'Test',
            Lastname:  'Meister',
            Email:     ctx.admin.username,
            Password:  (await Scrypt.kdf(ctx.admin.password, { logN: 15 })).toString('base64'),
            Role:      'admin',
        });
        console.info('\tadmin:', ctx.admin.username);
    }

    /**
     * Delete temporary admin user.
     */
    static async deleteAdmin(ctx) {
        await User.delete(ctx.admin.userId);
    }

    /**
     * Login to app using temporary admin account.
     */
    static async login() {
        await t
            .expect(path()).eql('/login')
            .typeText('input[name=username]', t.fixtureCtx.admin.username)
            .typeText('input[name=password]', t.fixtureCtx.admin.password)
            .click('button')
            .expect(path()).eql('/');
    }

    /**
     * Logout from app.
     */
    static async logout() {
        await t
            .click('nav a[href="/logout"]')
            .expect(path()).eql('/');
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Page;
