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

const koa          = require('koa');               // Koa framework
const body         = require('koa-body');          // body parser
const compose      = require('koa-compose');       // middleware composer
const compress     = require('koa-compress');      // HTTP compression
const responseTime = require('koa-response-time'); // X-Response-Time middleware
const session      = require('koa-session');       // session for passport login, flash messages
const mysql        = require('mysql-co');          // MySQL (co wrapper for mysql2)

const app = module.exports = koa();


// return response time in X-Response-Time header
app.use(responseTime());


// HTTP compression
app.use(compress({}));


// only search-index www subdomain
app.use(function* robots(next) {
    yield next;
    if (this.hostname.slice(0,3) != 'www') this.response.set('X-Robots-Tag', 'noindex, nofollow');
});


// parse request body into ctx.request.body
app.use(body());


// session for passport login, flash messages
app.keys = ['koa-sample-app'];
app.use(session(app));


// MySQL connection pool TODO: how to catch connection exception eg invalid password?
const config = require('./config/db-'+app.env+'.json');
global.connectionPool = mysql.createPool(config.db); // put in global to pass to sub-apps


// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
app.use(function* subApp() { // note no 'next'
    // use subdomain to determine which app to serve: www. as default, or admin. or api
    const subapp = this.hostname.split('.')[0]; // subdomain = part before first '.' of hostname

    switch (subapp) {
        case 'admin':
            yield compose(require('./apps/admin/app-admin.js').middleware);
            break;
        case 'api':
            yield compose(require('./apps/api/app-api.js').middleware);
            break;
        case 'www':
            yield compose(require('./apps/www/app-www.js').middleware);
            break;
        default: // no (recognised) subdomain? canonicalise host to www.host
            // note switch must include all registered subdomains to avoid potential redirect loop
            this.redirect(this.protocol+'://'+'www.'+this.host+this.path+this.search);
            break;
    }
});


if (!module.parent) {
    /* eslint no-console:off */
    app.listen(process.env.PORT||3000);
    const db = require('./config/db-'+app.env+'.json').db.database;
    console.log(process.version+' listening on port '+(process.env.PORT||3000)+' ('+app.env+'/'+db+')');
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
