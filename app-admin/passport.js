/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Passport authentication                                                                       */
/*                                                                                                */
/*  see                                                                                           */
/*   - passportjs.org/guide/configure                                                             */
/*   - passportjs.org/guide/username-password                                                     */
/*   - toon.io/understanding-passportjs-authentication-flow                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const passport      = require('koa-passport'); // authentication
const scrypt        = require('scrypt');       // scrypt library
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/user.js');


// serialise user: record authenticated user's id in session
passport.serializeUser(function(user, done) {
    done(null, user.UserId);
});


// deserialise user: restore user details to ctx.state.user from id stored in session
// qv github.com/rkusa/koa-passport-example/blob/master/auth.js#L15
passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.get(id); // lookup user
        done(null, user);
    } catch (e) {
        done(e);
    }
});


// use local strategy - passportjs.org/guide/username-password
passport.use(new LocalStrategy(async function(username, password, done) {
    const users = await User.getBy('Email', username); // lookup user

    let user = users.length>0 ? users[0] : null; // user found?

    if (user) { // verify password matches
        try {
            const match = await scrypt.verifyKdf(Buffer.from(user.Password, 'base64'), password);
            if (!match) user = null; // bad password
        } catch (e) {
            user = null; // e.g. "data is not a valid scrypt-encrypted block"
        }
    }

    done(null, user||false); // if validated ok, record user details
}));


// for other providers (facebook, twitter, google, etc) see passportjs.org/guide


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
