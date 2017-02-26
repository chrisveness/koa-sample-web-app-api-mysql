/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Admin' app - basic pages for adding/editing/deleting members & teams                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const Koa        = require('koa');            // koa framework
const handlebars = require('koa-handlebars'); // handlebars templating
const flash      = require('koa-flash');      // flash messages
const lusca      = require('koa-lusca');      // security header middleware
const passport   = require('koa-passport');   // authentication
const serve      = require('koa-static');     // static file serving middleware
const bunyan     = require('bunyan');         // logging
const koaLogger  = require('koa-bunyan');     // logging
const document   = require('jsdom').jsdom().defaultView.document; // DOM Document interface in Node!


const app = new Koa(); // admin app


// serve static files (html, css, js); allow browser to cache for 1 hour (note css/js req'd before login)
app.use(serve('public', { maxage: 1000*60*60 }));


// handlebars templating

const hbsSelectedHelper = function(value, options) {   // stackoverflow.com/questions/13046401#answer-15373215
    const select = document.createElement('select');   // create a select element
    select.innerHTML = options.fn(this);               // populate it with the option HTML
    select.value = value;                              // set the value
    if (select.children[select.selectedIndex]) {        // if selected node exists add 'selected' attribute
        select.children[select.selectedIndex].setAttribute('selected', true);
    }
    return select.innerHTML;
};

app.use(handlebars({
    extension:   [ 'html', 'handlebars' ],
    viewsDir:    'app-admin/templates',
    partialsDir: 'app-admin/templates/partials',
    helpers:     { selected: hbsSelectedHelper },
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
            case 403: // Forbidden
            case 409: // Conflict
                await ctx.render('400-bad-request', e);
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


// use passport authentication (local auth)
require('./passport.js');
app.use(passport.initialize());
app.use(passport.session());


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
    ctx.state.domain = ctx.host.replace('admin.', '');
    await next();
});


// logging
const access = { type: 'rotating-file', path: './logs/admin-access.log', level: 'trace', period: '1d', count: 4 };
const error  = { type: 'rotating-file', path: './logs/admin-error.log',  level: 'error', period: '1d', count: 4 };
const logger = bunyan.createLogger({ name: 'admin', streams: [ access, error ] });
app.use(koaLogger(logger, {}));


// ------------ routing

// public (unsecured) modules first

app.use(require('./routes/index-routes.js'));
app.use(require('./routes/login-routes.js'));

// verify user has authenticated...

app.use(async function authSecureRoutes(ctx, next) {
    if (ctx.isAuthenticated()) {
        await next();
    } else {
        ctx.redirect('/login'+ctx.url);
    }
});

// ... as subsequent modules require authentication

app.use(require('./routes/members-routes.js'));
app.use(require('./routes/teams-routes.js'));
app.use(require('./routes/ajax-routes.js'));
app.use(require('./routes/logs-routes.js'));
app.use(require('./routes/dev-routes.js'));


// serve static apidoc files (http://admin.localhost/apidoc) (note login required)
app.use(serve('app-api/apidoc', { maxage: 1000*60*60 }));


// end of the line: 404 status for any resource not found
app.use(function notFound(ctx) { // note no 'next'
    ctx.throw(404);
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = app;
