/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Validate user                                                                                 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let basicAuth = require('basic-auth'); // basic access authentication
let bcrypt    = require('co-bcrypt'); // bcrypt library
let crypto    = require('crypto');    // nodejs.org/api/crypto.html

let User   = require('../../models/user.js');

let validate = module.exports = {};


/**
 * Middleware to verify basic access user authentication; if this url is in urls, subsequent
 * middleware will require authentication by e-mail & password.
 *
 * This is used for initial authentication as it performs a (slow) bcrypt hash. It then leaves the
 * user record in this.auth.user.
 *
 * For production use, this should always be over SSL (note digest access authentication is not suitable
 * due to password hash constraints: see e.g. stackoverflow.com/questions/18551954#answer-18828089)
 */
validate.confirmBasicAuthUser = function(urls) {
    return function*(next) {
        // only apply this test to specified url(s) (others pass through to subsequent checks)
        if (typeof urls == 'string' && urls != this.request.url) { yield next; return; }
        if (urls instanceof Array && urls.indexOf(this.request.url) == -1) { yield next; return; }
        // TODO: regular expressions?

        // basic auth headers provided?
        let credentials = basicAuth(this.request);
        if (!credentials) this.throw(401); // Unauthorized

        // authenticates off email + cleartext password - this is slow as it requires bcrypt hashing
        let user = yield validate.userByEmail(credentials.name, credentials.pass);
        if (!user) this.throw(401); // Unauthorized

        // ok - record authenticated user in this.auth.user
        this.auth = { user: user };

        // and continue on
        yield next;
    };
};


/**
 * Middleware to verify basic access token authentication; subsequent middleware will require
 * authentication by user id & authentication token.
 *
 * This is used for subsequent authentication as there is no (slow) bcrypt hash required, just a
 * (fast) SHA-1 hash.
 *
 * For production use, this should always be over SSL (note digest access authentication is not suitable
 * due to password hash constraints: see e.g. stackoverflow.com/questions/18551954#answer-18828089)
 */
validate.confirmBasicAuthToken = function() {
    return function*(next) {
        let user = null;

        // basic auth headers provided?
        let credentials = basicAuth(this.request);
        if (!credentials) this.throw(401); // Unauthorized

        // authenticate off id + token (following auth request) - fast as no bcrypt hash required
        user = yield validate.userById(credentials.name, credentials.pass);
        if (!user) this.throw(401); // Unauthorized

        // ok - record authenticated user in this.auth.user
        this.auth = { user: user };

        // and continue on
        yield next;
    };
};


/**
 * Validate user identified by 'username' validated against 'password'; returns user record for
 * successful validation, or null for failed validation.
 *
 * This is slow as it does bcrypt.compare() on supplied password; it is used for / and /auth only.
 *
 * It records a limited-lifetime api token (24h) against the validated user for subsequent requests.
 */
validate.userByEmail = function*(username, password) {
    // lookup user
    let users = yield User.getBy('Email', username);
    if (users.length == 0) return null;
    let user = users[0];

    // check password
    let match = yield bcrypt.compare(password, user.Password);
    if (!match) return null;

    // validates ok - record api token for subsequent api requests; the stored api token is the
    // issue timestamp, the token given out is its sha1 hash
    user.ApiToken = new Date().toISOString();
    yield User.update(user.UserId, { ApiToken: user.ApiToken });

    // and return user record
    return user;
};


/**
 * Validate user 'id' has api token 'pw'; returns user record for successful validation,
 * or null for failed validation.
 *
 * This is fast as it uses primary key lookup, SHA-1 hash, and string comparison on api token.
 */
validate.userById = function*(id, pw) {
    // lookup user
    let user = yield User.get(id);
    if (!user) return null;
    if (user.ApiToken == null) return null;

    // api token less than 24 hours old?
    if (Date.now() - Date.parse(user.ApiToken) > 1000*60*60*24) return null;

    let token = crypto.createHash('sha1').update(user.ApiToken).digest('hex');
    if (pw !== token) return null;

    // validates ok - return user record
    return user;
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
