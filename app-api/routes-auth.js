/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle authentication /auth element                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Router from 'koa-router'; // router middleware for koa
import jwt    from 'jsonwebtoken'; // JSON Web Token implementation
import Scrypt from 'scrypt-kdf';   // scrypt key derivation function

const router = new Router();

import User   from '../models/user.js';


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
    const { username, password } = ctx.request.query;
    if (!username || !password) ctx.throw(401, 'Username/password not supplied');
    let [ user ] = await User.getBy('Email', username);

    // always invoke verify() (whether email found or not) to mitigate against timing attacks on authentication function
    const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
    let passwordMatch = null;
    try {
        passwordMatch = await Scrypt.verify(Buffer.from(passwordHash, 'base64'), password);
    } catch (e) {
        if (e instanceof RangeError) user = null; // "Invalid key"
        if (!(e instanceof RangeError)) throw e;
    }

    if (!user || !passwordMatch) ctx.throw(404, 'Username/password not found');

    const payload = {
        id:   user.UserId,                         // to get user details
        role: user.Role.slice(0, 1).toLowerCase(), // make role available without db query
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });
    ctx.response.body = { jwt: token, root: 'Auth' };
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
