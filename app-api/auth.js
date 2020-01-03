/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* API authentication - similar to login functions for the www site, but JWT token is obtained by */
/* a call to the /auth resource.                                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import jwt    from 'jsonwebtoken'; // JSON Web Token implementation
import Scrypt from 'scrypt-kdf';   // scrypt key derivation function

import User from '../models/user.js';


class Auth {

    /**
     * @api {get} /auth Get JWT authentication token for subsequent API requests
     * @apiName   GetAuth
     * @apiGroup  Auth
     *
     * @apiDescription Subsequent requests requiring authentication are made with the JSON Web Token
     *   obtained from /auth, supplied in the Bearer Authorization HTTP header.
     *
     *   Note that since this does a KDF verification, it is a *slow* operation. The returned token
     *   has a 24-hour limited lifetime.
     *
     * @apiParam   username                  Email of user to be authenticated.
     * @apiParam   password                  Password of user to be authenticated.
     * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
     * @apiSuccess jwt                       JSON Web Token be used for subsequent Authorization header
     */
    static async getAuth(ctx) {
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
    }


    /**
     * Verify the JSON Web Token authentication supplied in Bearer Authorization header, for API calls.
     *
     * If the token verifies, record the payload in ctx.state.auth.
     */
    static verifyJwtApi(ctx) {
        const secretKey = process.env.JWT_SECRET_KEY;
        if (!secretKey) ctx.throw(401, 'No JWT Secret Key available');

        if (!ctx.request.header.authorization) ctx.throw(401, 'Authorisation required');

        const [ scheme, token ] = ctx.request.header.authorization.split(' ');
        if (scheme != 'Bearer') ctx.throw(401, 'Invalid authorisation');

        if (token) {
            try {
                const payload = jwt.verify(token, secretKey); // throws on invalid token

                // valid token: accept it...
                ctx.state.auth = authDetails(payload);
            } catch (err) {
                if ([ 'invalid token', 'invalid signature', 'jwt malformed', 'jwt expired' ].includes(err.message)) {
                    ctx.throw(401, 'Invalid authentication'); // verify failed
                }
                ctx.throw(err.status || 500, err.message); // Internal Server Error
            }
        }
    }

}


Auth.middleware = {

    /**
     * Middleware to verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * Successful verification leaves JWT payload in ctx.state.auth
     */
    verifyJwtApi: function() {
        return async function(ctx, next) {
            Auth.verifyJwtApi(ctx);
            // if we had a valid token, the user is now set up as a logged-in user with details in ctx.state.auth
            await next();

        };
    },
};



/**
 * Copy payload, expand the cryptic abbreviated roles in the JWT token to full versions, & keep a
 * copy of the jwt token.
 */
function authDetails(jwtPayload, token) {
    const roles = { g: 'guest', a: 'admin', s: 'su' };

    const details = { ...jwtPayload };     // for user id  to look up user details (use copy of payload to not zap original)
    details.Role = roles[jwtPayload.role]; // expand abbreviated roles for authorisation checks
    details.jwt = token;                   // for ajax->api calls

    return details;
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Auth;
