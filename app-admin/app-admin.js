/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Admin' app - basic pages for adding/editing/deleting members & teams                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Koa        from 'koa';            // koa framework
import body       from 'koa-body';       // body parser
import handlebars from 'koa-handlebars'; // handlebars templating
import flash      from 'koa-flash';      // flash messages
import lusca      from 'koa-lusca';      // security header middleware
import serve      from 'koa-static';     // static file serving middleware
import convert    from 'koa-convert';    // until  koa-flash, koa-lusca updated to v2
import Router     from 'koa-router';     // router middleware for koa
import Debug      from 'debug';          // small debugging utility

const debug = Debug('app:req'); // debug each request

import HandlebarsHelpers from '../lib/handlebars-helpers.js';
import Log               from '../lib/log.js';
import Ssl               from '../lib/ssl-middleware.js';
import Login             from './handlers/login.js';


const app = new Koa(); // admin app


// don't search-index admin subdomain
app.use(async function robots(ctx, next) {
    await next();
    ctx.response.set('X-Robots-Tag', 'noindex, nofollow');
});


// serve static files (html, css, js); allow browser to cache for 1 day (note css/js req'd before login)
const maxage = app.env=='production' ? 1000*60*60*24 : 1000;
app.use(serve('public', { maxage: maxage }));


// log requests (excluding static files, into mongodb capped collection)
app.use(async function logAccess(ctx, next) {
    debug(ctx.request.method.padEnd(4) + ' ' + ctx.request.url);
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
        await Log.error(ctx, err);
        if (app.env == 'production') delete err.stack; // don't leak sensitive info!
        switch (ctx.response.status) {
            case 401: // Unauthorised (eg invalid JWT auth token)
                ctx.response.redirect('/login'+ctx.request.url);
                break;
            case 404: // Not Found
                if (err.message == 'Not Found') err.message = 'Couldn’t find that one!...'; // personalised 404
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
    }
});


// parse request body into ctx.request.body
// - multipart allows parsing of enctype=multipart/form-data
app.use(body({ multipart: true }));


// clean up post data - trim & convert blank fields to null
app.use(async function cleanPost(ctx, next) {
    for (const key in ctx.request.body) {
        if (typeof ctx.request.body[key] == 'string') {
            ctx.request.body[key] = ctx.request.body[key].trim();
            if (ctx.request.body[key] == '') ctx.request.body[key] = null;
        }
    }
    await next();
});


// flash messages
app.use(convert(flash())); // note koa-flash@1.0.0 is v1 middleware which generates deprecation notice


// lusca security headers
const luscaCspTrustedCdns = 'ajax.googleapis.com cdnjs.cloudflare.com maxcdn.bootstrapcdn.com';
const luscaCspDefaultSrc = `'self' 'unsafe-inline' ${luscaCspTrustedCdns}`; // 'unsafe-inline' required for <style> blocks
app.use(lusca({
    csp:            { policy: { 'default-src': luscaCspDefaultSrc } }, // Content-Security-Policy
    cto:            'nosniff',                                         // X-Content-Type-Options
    hsts:           { maxAge: 60*60*24*365, includeSubDomains: true }, // HTTP Strict-Transport-Security
    xframe:         'SAMEORIGIN',                                      // X-Frame-Options
    xssProtection:  true,                                              // X-XSS-Protection
    referrerPolicy: 'strict-origin-when-cross-origin',                 // Referrer-Policy
}));


// add the domain (host without subdomain) into koa ctx (used in index.html)
app.use(async function ctxAddDomain(ctx, next) {
    ctx.state.domain = ctx.request.host.replace('admin.', '');
    await next();
});


// ------------ routing


// force use of SSL (redirect http protocol to https)
app.use(Ssl.force({ trustProxy: true }));


// check if user is signed in; leaves id in ctx.state.auth.user.id if JWT verified
// (do this before login routes, as login page indicates if user is already logged in)
app.use(Login.middleware.verifyJwt());


// public (unsecured) modules first

import routesIndex   from './routes/index-routes.js';
import routesLogin   from './routes/login-routes.js';
import routesPasswd  from './routes/password-routes.js';

app.use(routesIndex);
app.use(routesLogin);
app.use(routesPasswd);


// verify user is signed in...

app.use(async function isSignedIn(ctx, next) {
    if (ctx.state.auth) {
        await next();
    } else {
        // authentication failed: redirect to login page
        ctx.flash = { loginfailmsg: 'Session expired: please sign in again' };
        ctx.response.redirect('/login'+ctx.request.url);
    }
});


// ... as subsequent modules require authentication

import routesMembers from './routes/members-routes.js';
import routesTeams   from './routes/teams-routes.js';
import routesAjax    from './routes/ajax-routes.js';
import routesDev     from './routes/dev-routes.js';
app.use(routesMembers);
app.use(routesTeams);
app.use(routesAjax);
app.use(routesDev);


// serve static apidoc files (http://admin.localhost/apidoc) (note login required)
app.use(serve('app-api/apidoc', { maxage: maxage }));


// 404 status for any unrecognised ajax requests (don't throw as don't want to return html page)
const router = new Router();
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

export default app;
