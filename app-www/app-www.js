/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'www' app - publicly available parts of the site                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Koa        = require('koa');            // koa framework
const handlebars = require('koa-handlebars'); // handlebars templating
const flash      = require('koa-flash');      // flash messages
const lusca      = require('koa-lusca');      // security header middleware
const serve      = require('koa-static');     // static file serving middleware
const bunyan     = require('bunyan');         // logging
const koaLogger  = require('koa-bunyan');     // logging


const app = new Koa(); // www app


// serve static files (html, css, js); allow browser to cache for 1 day (note css/js req'd before login)
const maxage = app.env=='production' ? 1000*60*60*24 : 1000;
app.use(serve('public', { maxage: maxage }));


// handlebars templating
app.use(handlebars({
    extension:   [ 'html', 'handlebars' ],
    viewsDir:    'app-www/templates',
    partialsDir: 'app-www/templates',
}));


// handle thrown or uncaught exceptions anywhere down the line
app.use(async function handleErrors(ctx, next) {
    try {

        await next();

    } catch (e) {
        ctx.status = e.status || 500;
        switch (ctx.status) {
            case 404: // Not Found
                const context404 = { msg: e.message=='Not Found'?null:e.message };
                await ctx.render('404-not-found', context404);
                break;
            default:
            case 500: // Internal Server Error
                console.error(ctx.status, e.message);
                const context500 = app.env=='production' ? {} : { e: e };
                await ctx.render('500-internal-server-error', context500);
                ctx.app.emit('error', e, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
    }
});


// clean up post data - trim & convert blank fields to null
app.use(async function cleanPost(ctx, next) {
    if (ctx.request.body !== undefined) {
        for (const key in ctx.request.body) {
            ctx.request.body[key] = ctx.request.body[key].trim();
            if (ctx.request.body[key] == '') ctx.request.body[key] = null;
        }
    }
    await next();
});


// flash messages
app.use(flash());


// lusca security headers
const luscaCspTrustedCdns = 'ajax.googleapis.com cdnjs.cloudflare.com maxcdn.bootstrapcdn.com';
const luscaCspDefaultSrc = `'self' 'unsafe-inline' ${luscaCspTrustedCdns}`; // 'unsafe-inline' required for <style> blocks
app.use(lusca({
    csp:           { policy: { 'default-src': luscaCspDefaultSrc } }, // Content-Security-Policy
    cto:           'nosniff',                                         // X-Content-Type-Options
    hsts:          { maxAge: 31536000, includeSubDomains: true },     // HTTP Strict-Transport-Security (1 year)
    xframe:        'SAMEORIGIN',                                      // X-Frame-Options
    xssProtection: true,                                              // X-XSS-Protection
}));


// add the domain (host without subdomain) into koa ctx (used in navpartial template)
app.use(async function ctxAddDomain(ctx, next) {
    ctx.state.domain = ctx.host.replace('www.', '');
    await next();
});


// logging
const access = { type: 'rotating-file', path: './logs/www-access.log', level: 'trace', period: '1d', count: 4 };
const error  = { type: 'rotating-file', path: './logs/www-error.log',  level: 'error', period: '1d', count: 4 };
const logger = bunyan.createLogger({ name: 'www', streams: [ access, error ] });
app.use(koaLogger(logger, {}));


// ------------ routing

app.use(require('./routes-www.js'));

// end of the line: 404 status for any resource not found
app.use(function notFound(ctx) { // note no 'next'
    ctx.throw(404);
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = app;
