/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Validate user                                                                                 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const basicAuth = require('basic-auth'); // basic access authentication
const scrypt    = require('scrypt');     // scrypt library
const crypto    = require('crypto');     // nodejs.org/api/crypto.html

const User   = require('../models/user.js');


class Validate {

    /**
     * Middleware to verify basic access user authentication; if this url is in urls, subsequent
     * middleware will require authentication by e-mail & password.
     *
     * This is used for initial authentication as it performs a (slow) scrypt kdf generation. It then
     * leaves the user record in ctx.state.auth.user.
     *
     * For production use, this should always be over SSL (note digest access authentication is not suitable
     * due to password hash constraints: see e.g. stackoverflow.com/questions/18551954#answer-18828089)
     */
    static confirmBasicAuthUser(urls) {
        return async function(ctx, next) {
            // only apply this test to specified url(s) (others pass through to subsequent checks)
            if (typeof urls == 'string' && urls != ctx.request.url) { await next(); return; }
            if (urls instanceof Array && urls.includes(ctx.request.url)) { await next(); return; }
            // TODO: regular expressions?

            // basic auth headers provided?
            const credentials = basicAuth(ctx.request);
            if (!credentials) ctx.throw(401); // Unauthorized

            // authenticates off email + cleartext password - this is slow as it requires scrypt hashing
            const user = await Validate.userByEmail(credentials.name, credentials.pass);
            if (!user) ctx.throw(401); // Unauthorized

            // ok - record authenticated user in ctx.state.auth.user
            ctx.state.auth = { user: user };

            // and continue on
            await next();
        };
    }


    /**
     * Middleware to verify basic access token authentication; subsequent middleware will require
     * authentication by user id & authentication token.
     *
     * This is used for subsequent authentication as there is no (slow) scrypt  kdf generation required,
     * just a (fast) SHA-1 hash.
     *
     * For production use, this should always be over SSL (note digest access authentication is not suitable
     * due to password hash constraints: see e.g. stackoverflow.com/questions/18551954#answer-18828089)
     */
    static confirmBasicAuthToken() {
        return async function(ctx, next) {
            // basic auth headers provided?
            const credentials = basicAuth(ctx.request);
            if (!credentials) ctx.throw(401); // Unauthorized

            // authenticate off id + token (following auth request) - fast as no scrypt hash required
            const user = await Validate.userById(credentials.name, credentials.pass);
            if (!user) ctx.throw(401); // Unauthorized

            // ok - record authenticated user in ctx.state.auth.user
            ctx.state.auth = { user: user };

            // and continue on
            await next();
        };
    }


    /**
     * Validate user identified by 'username' validated against 'password'; returns user record for
     * successful validation, or null for failed validation.
     *
     * This is slow as it does scrypt.verifyKdf() on supplied password; it is used for / and /auth only.
     *
     * It records a limited-lifetime api token (24h) against the validated user for subsequent requests.
     */
    static async userByEmail(username, password) {
        // lookup user
        const users = await User.getBy('Email', username);
        if (users.length == 0) return null;
        const user = users[0];

        // check password
        try {
            const match = await scrypt.verifyKdf(Buffer.from(user.Password, 'base64'), password);
            if (!match) return null; // bad password
        } catch (e) {
            return null; // e.g. "data is not a valid scrypt-encrypted block"
        }

        // validates ok - record api token for subsequent api requests; the stored api token is the
        // issue timestamp, the token given out is its sha1 hash
        user.ApiToken = new Date().toISOString();
        await User.update(user.UserId, { ApiToken: user.ApiToken });

        // and return user record
        return user;
    }


    /**
     * Validate user 'id' has api token 'pw'; returns user record for successful validation,
     * or null for failed validation.
     *
     * This is fast as it uses primary key lookup, SHA-1 hash, and string comparison on api token.
     */
    static async userById(id, pw) {
        // lookup user
        const user = await User.get(id);
        if (!user) return null;
        if (user.ApiToken == null) return null;

        // api token less than 24 hours old?
        if (Date.now() - Date.parse(user.ApiToken) > 1000*60*60*24) return null;

        const token = crypto.createHash('sha1').update(user.ApiToken).digest('hex');
        if (pw !== token) return null;

        // validates ok - return user record
        return user;
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Validate;
