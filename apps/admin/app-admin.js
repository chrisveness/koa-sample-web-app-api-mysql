/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Admin' app - basic pages for adding/editing/deleting members & teams                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const koa        = require('koa');            // koa framework
const flash      = require('koa-flash');      // flash messages
const handlebars = require('koa-handlebars'); // handlebars templating
const lusca      = require('koa-lusca');      // security header middleware
const passport   = require('koa-passport');   // authentication
const serve      = require('koa-static');     // static file serving middleware
const bunyan     = require('bunyan');         // logging
const koaLogger  = require('koa-bunyan');     // logging

const app = module.exports = koa(); // API app


// logging
const access = { type: 'rotating-file', path: './logs/admin-access.log', level: 'trace', period: '1d', count: 4 };
const error  = { type: 'rotating-file', path: './logs/admin-error.log',  level: 'error', period: '1d', count: 4 };
const logger = bunyan.createLogger({ name: 'admin', streams: [access, error] });
app.use(koaLogger(logger, {}));


// set up MySQL connection
app.use(function* mysqlConnection(next) {
    // keep copy of this.db in global for access from models
    this.db = global.db = yield global.connectionPool.getConnection();
    // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
    yield this.db.query('SET SESSION sql_mode = "TRADITIONAL"');

    yield next;

    this.db.release();
});


// use passport authentication (local auth)
require('./passport.js');
app.use(passport.initialize());
app.use(passport.session());


// handle thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {

        yield next;

    } catch (e) {
        let context = null;
        this.status = e.status || 500;
        switch (this.status) {
            case 404: // Not Found
                context = { msg: e.message=='Not Found'?null:e.message };
                yield this.render('404-not-found', context);
                break;
            case 403: // Forbidden
            case 409: // Conflict
                yield this.render('400-bad-request', e);
                break;
            case 500: // Internal Server Error
                console.log(e.status||'500', e.message);
                context = app.env=='production' ? {} : { e: e };
                yield this.render('500-internal-server-error', context);
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
                break;
        }
    }
});


// handlebars templating
app.use(handlebars({
    extension:   ['html', 'handlebars'],
    viewsDir:    'apps/admin/templates',
    partialsDir: 'apps/admin/templates/partials',
}));


// clean up post data - trim & convert blank fields to null
app.use(function* cleanPost(next) {
    if (this.request.body !== undefined) {
        for (const key in this.request.body) {
            this.request.body[key] = this.request.body[key].trim();
            if (this.request.body[key] == '') this.request.body[key] = null;
        }
    }
    yield next;
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


// add the domain (host without subdomain) into koa ctx
app.use(function* ctxAddDomain(next) {
    this.domain = this.host.replace('admin.', '');
    yield next;
});


// ------------ routing

// serve static files (html, css, js); allow browser to cache for 1 hour (note css/js req'd before login)
app.use(serve('public', { maxage: 1000*60*60 }));

// public (unsecured) modules first

app.use(require('./routes/index-routes.js'));
app.use(require('./routes/login-routes.js'));

// verify user has authenticated...

app.use(function* authSecureRoutes(next) {
    if (this.isAuthenticated()) {
        yield next;
    } else {
        this.redirect('/login'+this.url);
    }
});

// ... as subsequent modules require authentication

app.use(require('./routes/members-routes.js'));
app.use(require('./routes/teams-routes.js'));
app.use(require('./routes/ajax-routes.js'));
app.use(require('./routes/logs-routes.js'));
app.use(require('./routes/dev-routes.js'));


// serve static apidoc files (http://admin.localhost/apidoc) (note login required)
app.use(serve('apps/api/apidoc', { maxage: 1000*60*60 }));


// end of the line: 404 status for any resource not found
app.use(function* notFound(next) {
    yield next; // actually no next...

    this.status = 404;
    yield this.render('404-not-found');
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
