/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Passport authentication                                                                       */
/*                                                                                                */
/*  see                                                                                           */
/*   - passportjs.org/guide/configure                                                             */
/*   - passportjs.org/guide/username-password                                                     */
/*   - toon.io/understanding-passportjs-authentication-flow                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let co            = require('co');           // generator async control flow goodness
let passport      = require('koa-passport'); // authentication
let bcrypt        = require('co-bcrypt');    // bcrypt library
let LocalStrategy = require('passport-local').Strategy;

let User = require('../../models/user.js');


// serialise user: record authenticated user's id in session
passport.serializeUser(function(user, done) {
    done(null, user.UserId);
});


// deserialise user: restore user details to this.passport.user from id stored in session
passport.deserializeUser(function(id, done) {
    // koa-passport can't deserialize through generator functions, so use co to wrap yieldable calls
    co(function*() {
        // lookup user
        let user = yield User.get(id);
        return user || null;
    }).then(function(result) { done(null, result); }, done);
});


// use local strategy - passportjs.org/guide/username-password
passport.use(new LocalStrategy(function(username, password, done) {
    // LocalStrategy doesn't know about generator functions, so use co to wrap yieldable calls
    co(function*() {
        // lookup user
        let users = yield User.getBy('Email', username);
        if (users.length == 0) return false; // user not found
        let user = users[0];

        // verify password matches
        let match = yield bcrypt.compare(password, user.Password);
        if (!match) return false; // no password match

        // validated ok, record return user details
        return user;
    }).then(function(result) { done(null, result); }, done);
}));


/* perhaps one day we'll have simpler usage something like:

passport.serializeUser(function*(user) {
    return user.id;
});

passport.deserializeUser(function*(id) {
    return yield User.findById(id);
});

passport.use(new LocalStrategy(function*(username, password, done) {
    let users = yield User.getBy('Email', username);
    if (users.length == 0) return false; // user not found
    let user = users[0];

    // verify password matches
    let match = yield bcrypt.compare(password, user.Password);
    if (!match) return false; // no password match

    // validated ok, return user details
    return user;
});
*/

// for other providers (facebook, twitter, google, etc) see passportjs.org/guide


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
