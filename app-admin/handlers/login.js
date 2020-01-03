/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Login handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Scrypt from 'scrypt-kdf';   // scrypt key derivation function
import jwt    from 'jsonwebtoken'; // JSON Web Token implementation

import User from '../../models/user.js';


class LoginHandlers {

    /**
     * GET /login(.*) - render login page.
     *
     * A url can be supplied after the 'login', to specify a redirect after a successful login.
     *
     * If user is already logged in, login details are shown in place of login form.
     */
    static async getLogin(ctx) {
        const context = ctx.flash.formdata || {}; // failed login? fill in previous values
        await ctx.render('login', context);
    }


    /**
     * GET /logout - logout user
     */
    static getLogout(ctx) {
        ctx.cookies.set('sample-app:jwt', null, { signed: true }); // delete the cookie holding the JSON Web Token
        ctx.response.redirect('/');
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /login - process login
     *
     * If user authenticates, create JSON Web Token & record it in a signed cookie for subsequent
     * requests, and record the payload in ctx.state.auth.user.
     *
     * The JWT payload includes the user id, the user’s role so that authorisation checks can be
     * done without a database query (just initial letter so that the role in the token is not too
     * obvious), and whether the token can be renewed for a ‘remember-me’ function.
     */
    static async postLogin(ctx) {
        const body = ctx.request.body;

        let [ user ] = await User.getBy('Email', body.username); // lookup user

        // always invoke verify() (whether email found or not) to mitigate against timing attacks on login function
        const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
        let passwordMatch = null;
        try {
            passwordMatch = await Scrypt.verify(Buffer.from(passwordHash, 'base64'), body.password);
        } catch (e) {
            if (e instanceof RangeError) user = null; // "Invalid key"
            if (!(e instanceof RangeError)) throw e;
        }

        if (!user || !passwordMatch) {
            // login failed: redisplay login page with login fail message
            const loginfailmsg = 'E-mail / password not recognised';
            ctx.flash = { formdata: body, loginfailmsg: loginfailmsg };
            return ctx.response.redirect(ctx.request.url);
        }

        // submitted credentials validate: create JWT & record it in a cookie to 'log in' user

        const payload = {
            id:       user.UserId,                          // to get user details
            name:     `${user.Firstname} ${user.Lastname}`, // make name available without db query
            role:     user.Role.slice(0, 1).toLowerCase(),  // make role available without db query
            remember: body['remember-me'] ? true : false,   // whether token can be renewed
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });

        // record token in signed cookie; if 'remember-me', set cookie for 1 week, otherwise set session only
        const options = { signed: true };
        if (body['remember-me']) options.expires = new Date(Date.now() + 1000*60*60*24*7);

        ctx.cookies.set('sample-app:jwt', token, options);

        // if we were provided with a redirect URL after the /login, redirect there, otherwise /
        const href = ctx.request.url=='/login' ? '/' : ctx.request.url.replace('/login', '');
        ctx.response.redirect(href);
    }


    /**
     * Verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * If the token verifies,
     * - record the payload in ctx.state.auth.user
     * - record the token in ctx.state.auth.jwt for ajax->api calls
     * - if required, extend the cookie auth for a further 24 hours
     * - & return true
     * ... otherwise return false.
     *
     * This is normally called via the middleware, but in some cases could be called directly.
     *
     * Issued tokens have 24-hour validity. If the cookie contains an expired token, and the user
     * logged with using the 'remember-me' option, then issue a replacement 24-hour token, and renew
     * the cookie for a further 7 days. The 'remember-me' function will lapse after 7 days inactivity.
     *
     * Throws 401 if an invalid token is supplied.
     */
    static verifyJwt(ctx) {
        const secretKey = process.env.JWT_SECRET_KEY;
        if (!secretKey) throw new Error('No JWT secret key available');

        const options = { signed: true };
        const token = ctx.cookies.get('sample-app:jwt', options);

        if (!token) return false; // not logged in

        if (token) { // verify JWT login token - will throw on invalid token
            try {
                const payload = jwt.verify(token, secretKey); // throws on invalid token

                // valid token: accept it...
                ctx.state.auth = {
                    user: authDetails(payload),
                    jwt:  token, // for ajax->api calls
                };
            } catch (err) {
                // verify failed - retry with ignore expire option
                try {
                    const payload = jwt.verify(token, secretKey, { ignoreExpiration: true });

                    ctx.state.auth = {
                        user: authDetails(payload),
                        jwt:  token, // for ajax->api calls
                    };

                    // ... and re-issue a replacement token for a further 24 hours
                    delete payload.exp;
                    const replacementToken = jwt.sign(payload, secretKey, { expiresIn: '24h' });
                    if (payload.remember) options.expires = new Date(Date.now() + 1000*60*60*24*7); // remember-me for 7d
                    ctx.cookies.set('racedrone:jwt', replacementToken, options);
                } catch (e) {
                    if ([ 'invalid token', 'invalid signature', 'jwt malformed' ].includes(e.message)) {
                        // delete the cookie holding the JSON Web Token
                        ctx.cookies.set('racedrone:jwt', null, options);
                        ctx.throw(401, 'Invalid authentication'); // verify (both!) failed
                    }
                    ctx.throw(e.status || 500, e.message); // Internal Server Error
                }
            }
        }

        return true; // payload is now recorded in ctx.state.auth
    }

}


LoginHandlers.middleware = {

    /**
     * Middleware to verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * Successful verification leaves JWT payload in ctx.state.auth
     */
    verifyJwt: function() {
        return async function(ctx, next) {
            LoginHandlers.verifyJwt(ctx);
            // if we had a valid token, the user is now set up as a logged-in user with details in ctx.state.auth
            await next();
        };
    },


    /**
     * Middleware to confirm user is logged in: if not, user is redirected to login page.
     */
    confirmSignedIn: function() {
        return async function(ctx, next) {
            if (ctx.state.auth) {
                await next();
            } else {
                // authentication failed: redirect to login page
                ctx.flash = { loginfailmsg: 'Session expired: please sign in again' };
                ctx.response.redirect('/login'+ctx.request.url);
            }
        };
    },


    /**
     * Middleware to verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * Successful verification leaves JWT payload in ctx.state.auth
     */
    verifyJwtApi: function() {
        return async function(ctx, next) {
            LoginHandlers.verifyJwtApi(ctx);
            // if we had a valid token, the user is now set up as a logged-in user with details in ctx.state.auth
            await next();

        };
    },
};


/**
 * Copy payload, expand the cryptic abbreviated roles in the JWT token to full versions.
 */
function authDetails(jwtPayload) {
    const roles = { g: 'guest', a: 'admin', s: 'su' };

    const details = { ...jwtPayload };     // for user id  to look up user details (use copy of payload to not zap original)
    details.Role = roles[jwtPayload.role]; // expand abbreviated roles for authorisation checks

    return details;
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default LoginHandlers;
