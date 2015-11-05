/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Simple app to explore Node.js + Koa + MySQL basics for CRUD admin + API                        */
/*                                                                                                */
/* App comprises three (composed) sub-apps:                                                       */
/*  - admin. (pages for interactively managing data)                                              */
/*  - api.   (RESTful CRUD API)                                                                   */
/*  - www.   (public website pages)                                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';
/* eslint "no-shadow":0 *//* app is already declared in the upper scope */

const koa          = require('koa');               // Koa framework
const body         = require('koa-body');          // body parser
const compose      = require('koa-compose');       // middleware composer
const compress     = require('koa-compress');      // HTML compression
const responseTime = require('koa-response-time'); // X-Response-Time middleware
const session      = require('koa-session');       // session for passport login, flash messages
const mysql        = require('mysql-co');          // MySQL (co wrapper for mysql2)

const app = module.exports = koa();


// return response time in X-Response-Time header
app.use(responseTime());


// HTML compression
app.use(compress({}));


// parse request body into ctx.request.body
app.use(body());


// session for passport login, flash messages
app.keys = ['koa-sample-app'];
app.use(session(app));


// MySQL connection pool TODO: how to catch connection exception eg invalid password?
const config = require('./config/db-'+app.env+'.json');
GLOBAL.connectionPool = mysql.createPool(config.db); // put in GLOBAL to pass to sub-apps


// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
// qv github.com/koajs/examples/tree/master/vhost
app.use(function* subApp(next) {
    // use subdomain to determine which app to serve: www. as default, or admin. or api
    const subapp = this.hostname.split('.')[0]; // subdomain = part before first '.' of hostname

    switch (subapp) {
        case 'admin':
            const adminApp = composer(require('./apps/admin/app-admin.js'));
            return yield adminApp.call(this, next);
        case 'api':
            const apiApp   = composer(require('./apps/api/app-api.js'));
            return yield apiApp.call(this, next);
        case 'www':
            const wwwApp   = composer(require('./apps/www/app-www.js'));
            return yield wwwApp.call(this, next);
        default: // no subdomain? canonicalise hostname to www.hostname
            this.redirect(this.protocol+'://'+'www.'+this.host+this.path+this.search);
            break;
    }
});
// composer for sub-apps: github.com/koajs/examples/blob/master/vhost
function composer(app) {
    const middleware = app instanceof koa ? app.middleware : app;
    return compose(middleware);
}


if (!module.parent) {
    /* eslint no-console: 0 */
    app.listen(process.env.PORT||3000);
    const db = require('./config/db-'+app.env+'.json').db.database;
    console.log(process.version+' listening on port '+(process.env.PORT||3000)+' ('+app.env+'/'+db+')');
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
