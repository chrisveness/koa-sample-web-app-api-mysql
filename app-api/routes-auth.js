/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle authentication /auth element                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa
const jwt    = require('jsonwebtoken'); // JSON Web Token implementation
const scrypt = require('scrypt');       // scrypt library

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
    const [user] = await User.getBy('Email', ctx.query.username);

    if (!user) ctx.throw(404, 'Username/password not found');

    // check password
    try {
        const match = await scrypt.verifyKdf(Buffer.from(user.Password, 'base64'), ctx.query.password);

        if (!match) ctx.throw(404, 'Username/password not found');

        const payload = {
            id:   user.UserId,                         // to get user details
            role: user.Role.slice(0, 1).toLowerCase(), // make role available without db query
        };
        const token = jwt.sign(payload, 'koa-sample-app-signature-key', { expiresIn: '24h' });
        ctx.body = { jwt: token, root: 'Auth' };
    } catch (e) { // e.g. "data is not a valid scrypt-encrypted block"
        ctx.throw(404, 'Username/password not found');
    }
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
