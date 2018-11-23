/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Admin' app - basic pages for adding/editing/deleting members & teams                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const Koa        = require('koa');            // koa framework
const handlebars = require('koa-handlebars'); // handlebars templating
const flash      = require('koa-flash');      // flash messages
const lusca      = require('koa-lusca');      // security header middleware
const serve      = require('koa-static');     // static file serving middleware
const jwt        = require('jsonwebtoken');   // JSON Web Token implementation
const koaRouter  = require('koa-router');     // router middleware for koa
const router = koaRouter();

const HandlebarsHelpers = require('../lib/handlebars-helpers.js');
const Log               = require('../lib/log.js');


const app = new Koa(); // admin app


// serve static files (html, css, js); allow browser to cache for 1 day (note css/js req'd before login)
const maxage = app.env=='production' ? 1000*60*60*24 : 1000;
app.use(serve('public', { maxage: maxage }));


// log requests (excluding static files, into mongodb capped collection)
app.use(async function logAccess(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();

    await Log.access(ctx, t2 - t1);
});


// handlebars templating
app.use(handlebars({
    extension:   [ 'html', 'handlebars' ],
    viewsDir:    'app-admin/templates',
    partialsDir: 'app-admin/templates/partials',
    helpers:     { selected: HandlebarsHelpers.selected, checked: HandlebarsHelpers.checked },
}));


// handle thrown or uncaught exceptions anywhere down the line
app.use(async function handleErrors(ctx, next) {
    try {

        await next();

    } catch (err) {
        ctx.response.status = err.status || 500;
        if (app.env == 'production') delete err.stack; // don't leak sensitive info!
        switch (ctx.response.status) {
            case 401: // Unauthorised (eg invalid JWT auth token)
                ctx.response.redirect('/login'+ctx.request.url);
                break;
            case 404: // Not Found
                if (err.message == 'Not Found') err.message = null; // personalised 404
                await ctx.render('404-not-found', { err });
                break;
            case 403: // Forbidden
            case 409: // Conflict
                await ctx.render('400-bad-request', { err });
                break;
            default:
            case 500: // Internal Server Error (for uncaught or programming errors)
                await ctx.render('500-internal-server-error', { err });
                // ctx.app.emit('error', err, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
        await Log.error(ctx, err);
    }
});


// set up MySQL connection
app.use(async function mysqlConnection(ctx, next) {
    try {

        // keep copy of ctx.state.db in global for access from models
        ctx.state.db = global.db = await global.connectionPool.getConnection();
        ctx.state.db.connection.config.namedPlaceholders = true;
        // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
        await ctx.state.db.query('SET SESSION sql_mode = "TRADITIONAL"');

        await next();

        ctx.state.db.release();

    } catch (e) {
        // note if getConnection() fails we have no this.state.db, but if anything downstream throws,
        // we need to release the connection
        if (ctx.state.db) ctx.state.db.release();
        throw e;
    }
});


// clean up post data - trim & convert blank fields to null
app.use(async function cleanPost(ctx, next) {
    if (ctx.request.body !== undefined) {
        // koa-body puts multipart/form-data form fields in request.body.{fields,files}
        const multipart = 'fields' in ctx.request.body && 'files' in ctx.request.body;
        const body =  multipart ? ctx.request.body.fields : ctx.request.body;
        for (const key in body) {
            if (typeof body[key] == 'string') {
                body[key] = body[key].trim();
                if (body[key] == '') body[key] = null;
            }
        }
    }
    await next();
});


// flash messages
app.use(flash()); // note koa-flash@1.0.0 is v1 middleware which generates deprecation notice


// lusca security headers
const luscaCspTrustedCdns = 'ajax.googleapis.com cdnjs.cloudflare.com maxcdn.bootstrapcdn.com';
const luscaCspDefaultSrc = `'self' 'unsafe-inline' ${luscaCspTrustedCdns}`; // 'unsafe-inline' required for <style> blocks
app.use(lusca({ // note koa-lusca@2.2.0 is v1 middleware which generates deprecation notice
    csp:           { policy: { 'default-src': luscaCspDefaultSrc } }, // Content-Security-Policy
    cto:           'nosniff',                                         // X-Content-Type-Options
    hsts:          { maxAge: 60*60*24*365, includeSubDomains: true }, // HTTP Strict-Transport-Security
    xframe:        'SAMEORIGIN',                                      // X-Frame-Options
    xssProtection: true,                                              // X-XSS-Protection
}));


// add the domain (host without subdomain) into koa ctx (used in index.html)
app.use(async function ctxAddDomain(ctx, next) {
    ctx.state.domain = ctx.request.host.replace('admin.', '');
    await next();
});


// ------------ routing


// check if user is signed in; leaves id in ctx.state.user.id if JWT verified
// (do this before login routes, as login page indicates if user is already logged in)
app.use(verifyJwt);


// public (unsecured) modules first

app.use(require('./routes/index-routes.js'));
app.use(require('./routes/login-routes.js'));
app.use(require('./routes/password-routes.js'));


// verify user is signed in...

app.use(async function isSignedIn(ctx, next) {
    if (ctx.state.user) {
        await next();
    } else {
        // authentication failed: redirect to login page
        ctx.flash = { loginfailmsg: 'Session expired: please sign in again' };
        ctx.response.redirect('/login'+ctx.request.url);
    }
});


// ... as subsequent modules require authentication

app.use(require('./routes/members-routes.js'));
app.use(require('./routes/teams-routes.js'));
app.use(require('./routes/ajax-routes.js'));
app.use(require('./routes/dev-routes.js'));


// serve static apidoc files (http://admin.localhost/apidoc) (note login required)
app.use(serve('app-api/apidoc', { maxage: maxage }));


// 404 status for any unrecognised ajax requests (don't throw as don't want to return html page)
router.all(/\/ajax\/(.*)/, function(ctx) {
    ctx.response.body = { message: 'Not Found' };
    ctx.response.body.root = 'error';
    ctx.response.status = 404; // Not Found
});


// end of the line: 404 status for any resource not found
app.use(function notFound(ctx) { // note no 'next'
    ctx.throw(404);
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * Verify the JSON Web Token authentication supplied in (signed) cookie.
 *
 * If the token verifies, record the payload in ctx.state.user: the UserId is held in ctx.state.user.id.
 *
 * Issued tokens have 24-hour validity. If the cookie contains an expired token, and the user logged
 * with using the 'remember-me' option, then issue a replacement 24-hour token, and renew the cookie
 * for a further 7 days. The 'remember-me' function will lapse after 7 days inactivity.
 */
async function verifyJwt(ctx, next) {
    const roles = { g: 'guest', a: 'admin', s: 'su' };

    const token = ctx.cookies.get('koa:jwt', { signed: true });

    if (token) {
        try {
            const  payload = jwt.verify(token, 'koa-sample-app-signature-key'); // throws on invalid token

            // valid token: accept it...
            ctx.state.user = payload;                  // for user id  to look up user details
            ctx.state.user.Role = roles[payload.role]; // for authorisation checks
            ctx.state.user.jwt = token;                // for ajax->api calls
        } catch (err) {
            // verify failed - retry with ignore expire option
            try {
                const payload = jwt.verify(token, 'koa-sample-app-signature-key', { ignoreExpiration: true });

                // valid token except for exp: accept it...
                ctx.state.user = Object.assign({}, payload); // (preserve original payload for reuse)
                ctx.state.user.Role = roles[payload.role];
                ctx.state.user.jwt = token;

                // ... and re-issue a replacement token for a further 24 hours
                delete payload.exp;
                const replacementToken = jwt.sign(payload, 'koa-sample-app-signature-key', { expiresIn: '24h' });
                const options = { signed: true };
                if (payload.remember) options.expires = new Date(Date.now() + 1000*60*60*24*7); // remember-me for 7d
                ctx.cookies.set('koa:jwt', replacementToken, options);
            } catch (e) {
                if (e.message == 'invalid token') ctx.throw(401, 'Invalid authentication'); // verify (both!) failed
                ctx.throw(e.status||500, e.message); // Internal Server Error
            }
        }
    }

    await next();
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = app;
