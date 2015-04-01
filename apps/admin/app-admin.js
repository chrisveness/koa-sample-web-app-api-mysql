/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Admin' app - basic pages for adding/editing/deleting members & teams                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


let koa        = require('koa');            // koa framework
let flash      = require('koa-flash');      // flash messages
let handlebars = require('koa-handlebars'); // handlebars templating
let helmet     = require('koa-helmet');     // security header middleware
let passport   = require('koa-passport');   // authentication
let bunyan     = require('bunyan');         // logging
let koaLogger  = require('koa-bunyan');     // logging

let app = module.exports = koa(); // API app


// logging
let access = { type: 'rotating-file', path: './logs/admin-access.log', level: 'trace', period: '1d', count: 4 };
let error  = { type: 'rotating-file', path: './logs/admin-error.log',  level: 'error', period: '1d', count: 4 };
let logger = bunyan.createLogger({ name: 'admin', streams: [ access, error ] });
app.use(koaLogger(logger, {}));


// set up MySQL connection
app.use(function* mysqlConnection(next) {
    // keep copy of this.db in GLOBAL for access from models
    this.db = GLOBAL.db = yield GLOBAL.connectionPool.getConnection();
    // MySQL strict mode (as per v5.6) to ensure not null is respected for unsupplied fields
    yield this.db.query(`SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES'`);

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
                yield this.render('templates/404-not-found', context );
                break;
            case 406: // Not Acceptable
                context = { msg: e.message=='Not Acceptable'?null:e.message };
                yield this.render('templates/406-not-acceptable', context );
                break;
            case 500: // Internal Server Error
                context = app.env=='production' ? {} : { e: e };
                yield this.render('templates/500-internal-server-error', context );
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
                break;
        }
    }
});


// handlebars templating
app.use(handlebars({
    extension:   ['html', 'handlebars'],
    viewsDir:    'apps/admin',
    partialsDir: 'apps/admin/templates',
}));


// clean up post data - trim & convert blank fields to null
app.use(function* cleanPost(next) {
    if (this.request.body !== undefined) {
        for (let key in this.request.body) {
            this.request.body[key] = this.request.body[key].trim();
            if (this.request.body[key] == '') this.request.body[key] = null;
        }
    }
    yield next;
});


// flash messages
app.use(flash());


// helmet security headers
app.use(helmet.defaults());


// add the domain (host without subdomain) into koa ctx
app.use(function* ctxAddDomain(next) {
    this.domain = this.host.replace('admin.', '');
    yield next;
});


// ------------ routing

// public (unsecured) modules first

app.use(require('./index/routes-index.js'));
app.use(require('./login/routes-login.js'));

// verify user has authenticated...

app.use(function* authSecureRoutes(next) {
    if (this.isAuthenticated()) {
        yield next;
    } else {
        this.redirect('/login'+this.url);
    }
});

// ... as subsequent modules require authentication

app.use(require('./members/routes-members.js'));
app.use(require('./teams/routes-teams.js'));
app.use(require('./ajax/routes-ajax.js'));
app.use(require('./logs/routes-logs.js'));


// end of the line: 404 status for any resource not found
app.use(function* notFound(next) {
    yield next; // actually no next...

    this.status = 404;
    yield this.render('templates/404-not-found');
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
