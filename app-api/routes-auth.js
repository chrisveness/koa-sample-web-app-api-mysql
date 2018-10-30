/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle authentication /auth element                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa
const jwt    = require('jsonwebtoken'); // JSON Web Token implementation
const Scrypt = require('scrypt-kdf');   // scrypt key derivation function

const User   = require('../models/user.js');


/**
 * @api {get} /auth Get JWT authentication token for subsequent API requests
 * @apiName   GetAuth
 * @apiGroup  Auth
 *
 * @apiDescription Subsequent requests requiring authentication are made with the JSON Web Token
 *   obtained from /auth, supplied in the Bearer Authorization HTTP header.
 *
 *   Note that since this does a KDF verification, it is a *slow* operation. The returned token has a
 *   24-hour limited lifetime.
 *
 * @apiParam   username                  Email of user to be authenticated.
 * @apiParam   password                  Password of user to be authenticated.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiSuccess jwt                       JSON Web Token be used for subsequent Authorization header
 */
router.get('/auth', async function getAuth(ctx) {
    let [ user ] = await User.getBy('Email', ctx.query.username);

    // always invoke verify() (whether email found or not) to mitigate against timing attacks on login function
    const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
    let passwordMatch = null;
    try {
        passwordMatch = await Scrypt.verify(passwordHash, ctx.query.password);
    } catch (e) {
        user = null; // e.g. "Invalid key"
    }

    if (!user || !passwordMatch) ctx.throw(404, 'Username/password not found');

    const payload = {
        id:   user.UserId,                         // to get user details
        role: user.Role.slice(0, 1).toLowerCase(), // make role available without db query
    };
    const token = jwt.sign(payload, 'koa-sample-app-signature-key', { expiresIn: '24h' });
    ctx.body = { jwt: token, root: 'Auth' };
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
