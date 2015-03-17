/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Validate user                                                                                 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let bcrypt = require('co-bcrypt'); // bcrypt library
let crypto = require('crypto');    // nodejs.org/api/crypto.html

let User   = require('../../models/user.js');

let validate = module.exports = {};


/**
 * Validate user identified by 'username' validates against 'password'; returns user record for
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
 * This is fast as it uses primary key and string comparison on api token.
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
