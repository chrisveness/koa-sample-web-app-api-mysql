/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Simple app to explore Node.js + Koa + MySQL basics for CRUD admin + API                        */
/*                                                                                                */
/* App comprises three (composed) sub-apps:                                                       */
/*  - www.   (public website pages)                                                               */
/*  - admin. (pages for interactively managing data)                                              */
/*  - api.   (RESTful CRUD API)                                                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* eslint no-shadow:off *//* app is already declared in the upper scope */

const koa      = require('koa');            // Koa framework
const body     = require('koa-body');       // body parser
const compose  = require('koa-compose');    // middleware composer
const compress = require('koa-compress');   // HTTP compression
const session  = require('koa-session');    // session for passport login, flash messages
const mysql    = require('mysql2/promise'); // fast mysql driver
const debug    = require('debug')('app');   // small debugging utility

const app = module.exports = koa();


// MySQL connection pool (set up on app initialisation)
const config = require('./config/db-'+app.env+'.json');
global.connectionPool = mysql.createPool(config.db); // put in global to pass to sub-apps


/* set up middleware which will be applied to each request - - - - - - - - - - - - - - - - - - -  */


// return response time in X-Response-Time header
app.use(function* responseTime(next) {
    const t1 = Date.now();
    yield next;
    const t2 = Date.now();
    this.set('X-Response-Time', Math.ceil(t2-t1)+'ms');
});


// HTTP compression
app.use(compress({}));


// only search-index www subdomain
app.use(function* robots(next) {
    yield next;
    if (this.hostname.slice(0,3) != 'www') this.response.set('X-Robots-Tag', 'noindex, nofollow');
});


// parse request body into this.request.body
app.use(body());


// session for passport login, flash messages
app.keys = ['koa-sample-app'];
app.use(session(app));


// sometimes useful to be able to track each request...
app.use(function*(next) {
    debug(this.method + ' ' + this.url);
    yield next;
});


// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
// separate sub-apps can be used for modularisation of a large system, for different login/access
// rights for public/protected elements, and also for different functionality between api & web
// pages (content negotiation, error handling, handlebars templating, etc).

app.use(function* subApp(next) {
    // use subdomain to determine which app to serve: www. as default, or admin. or api
    this.state.subapp = this.hostname.split('.')[0]; // subdomain = part before first '.' of hostname
    // note: could use root part of path instead of sub-domains e.g. this.request.url.split('/')[1]
    yield next;
});

app.use(function* composeSubapp() { // note no 'next' after composed subapp
    switch (this.state.subapp) {
        case 'admin': yield compose(require('./apps/admin/app-admin.js').middleware); break;
        case 'api':   yield compose(require('./apps/api/app-api.js').middleware);     break;
        case 'www':   yield compose(require('./apps/www/app-www.js').middleware);     break;
        default: // no (recognised) subdomain? canonicalise host to www.host
            // note switch must include all registered subdomains to avoid potential redirect loop
            this.redirect(this.protocol+'://'+'www.'+this.host+this.path+this.search);
            break;
    }
});


/* create server - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


if (!module.parent) {
    /* eslint no-console:off */
    app.listen(process.env.PORT||3000);
    const db = require('./config/db-'+app.env+'.json').db.database;
    console.log(process.version+' listening on port '+(process.env.PORT||3000)+' ('+app.env+'/'+db+')');
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
