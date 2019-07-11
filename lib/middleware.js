/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Middleware                                                                                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import jwt from 'jsonwebtoken'; // JSON Web Token implementation


class Middleware {

    /**
     * Force SSL; if protocol is http and NODE_ENV is production, redirect to same url
     * using https.
     *
     * Note if app.proxy is true, ctx.request.secure will respect X-Forwarded-Proto, hence
     * opt.trustProxy is implied.
     *
     * qv github.com/jclem/koa-ssl, github.com/turboMaCk/koa-sslify
     *
     * @param {boolean} options.disabled=NODE_ENV!='production' - If true, all requests will be
     *   allowed through.
     * @param {boolean} options.trustProxy=false - If true, trust the x-forwarded-proto header; qv
     *   devcenter.heroku.com/articles/http-routing#heroku-headers.
     */
    static ssl(options) {
        const defaults = { disabled: process.env.NODE_ENV != 'production', trustProxy: false };
        const opt = { ...defaults, ...options };

        return async function sslMiddleware(ctx, next) {
            if (opt.disabled) { // nothing to do
                await next();
                return;
            }

            const xfp = ctx.request.get('x-forwarded-proto');
            const isSecure = ctx.request.secure || (opt.trustProxy && xfp=='https');

            if (isSecure) { // secure or trusted, all well & good
                await next();
                return;
            }

            if (ctx.request.method=='GET' || ctx.request.method=='HEAD') { // redirect to https equivalent
                ctx.response.status = 301; // Moved Permanently
                ctx.response.redirect(ctx.request.href.replace(/^http/, 'https'));
                return;
            }

            ctx.response.status = 403; // otherwise respond Forbidden
        };
    }


    /**
     * Verify the JSON Web Token authentication supplied in (signed) cookie.
     *
     * If the token verifies, record the payload in ctx.state.user: the UserId is held in ctx.state.user.id.
     *
     * Issued tokens have 24-hour validity. If the cookie contains an expired token, and the user logged
     * with using the 'remember-me' option, then issue a replacement 24-hour token, and renew the cookie
     * for a further 7 days. The 'remember-me' function will lapse after 7 days inactivity.
     */
    static verifyJwt() {
        return async function verifyJwtMiddleware(ctx, next) {
            const secretKey = process.env.JWT_SECRET_KEY;
            if (!secretKey) throw new Error('No JWT secret key available');

            // the jwt cookie is held against the top-level domain, for login interoperability between subdomains
            const domain = ctx.request.hostname.replace(/^admin\.|^assessment\./, '');
            const options = { signed: true, domain: domain };
            const token = ctx.cookies.get('koa:jwt', options);

            if (token) {
                try {
                    const payload = jwt.verify(token, secretKey); // throws on invalid token

                    // valid token: accept it...
                    ctx.state.user = authDetails(payload, token);
                } catch (err) {
                    // verify failed - retry with ignore expire option
                    try {
                        const payload = jwt.verify(token, secretKey, { ignoreExpiration: true });

                        // valid token except for exp: accept it...
                        ctx.state.user = authDetails(payload, token);

                        // ... and re-issue a replacement token for a further 24 hours
                        delete payload.exp;
                        const replacementToken = jwt.sign(payload, secretKey, { expiresIn: '24h' });
                        if (payload.remember) options.expires = new Date(Date.now() + 1000*60*60*24*7); // remember-me for 7d
                        ctx.cookies.set('koa:jwt', replacementToken, options);
                    } catch (e) {
                        if ([ 'invalid token', 'invalid signature', 'jwt malformed' ].includes(e.message)) {
                            // delete the cookie holding the JSON Web Token
                            ctx.cookies.set('koa:jwt', null, options);
                            ctx.throw(401, 'Invalid authentication'); // verify (both!) failed
                        }
                        ctx.throw(e.status || 500, e.message); // Internal Server Error
                    }
                }
            }

            // if we had a valid token, the user is now set up as a logged-in user with details in ctx.state.user
            await next();
        };
    }


    /**
     * Verify the JSON Web Token authentication supplied in Bearer Authorization header, for API calls.
     *
     * If the token verifies, record the payload in ctx.state.auth.
     */
    static verifyJwtApi() {
        return async function verifyJwtMiddleware(ctx, next) {
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

            // if we had a valid token, the request is now authenticated with auth details in ctx.state.auth
            await next();
        };
    }

}


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

export default Middleware;
