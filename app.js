/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Simple app to explore Node.js + Koa + MySQL basics for CRUD admin + API                        */
/*                                                                                                */
/* App comprises three (composed) sub-apps:                                                       */
/*  - admin. (pages for interactively managing data)                                              */
/*  - api.   (RESTful CRUD API)                                                                   */
/*  - www.   (public website pages)                                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let koa          = require('koa');               // Koa framework
let bodyParser   = require('koa-body-parser');   // body parser
let compose      = require('koa-compose');       // middleware composer
let compress     = require('koa-compress');      // HTML compression
let responseTime = require('koa-response-time'); // X-Response-Time middleware
let session      = require('koa-session');       // session for passport login, flash messages
let serve        = require('koa-static');        // static file serving middleware
let mysql        = require('mysql-co');          // MySQL (co wrapper for mysql2)

let app = module.exports = koa();


// return response time in X-Response-Time header
app.use(responseTime());


// HTML compression
app.use(compress({}));


// serve static files (html, css, js); allow browser to cache for 1 hour
app.use(serve('public', { maxage: 1000*60*60 }));


// parse request body into ctx.request.body
app.use(bodyParser());


// session for passport login, flash messages
app.keys = ['koa-sample-app'];
app.use(session(app));


// MySQL connection pool TODO: how to catch connection exception eg invalid password?
let config = require('./config/db-'+app.env+'.json');
GLOBAL.connectionPool = mysql.createPool(config.db); // put in GLOBAL to pass to sub-apps


// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
// qv github.com/koajs/examples/tree/master/vhost
app.use(function* subApp(next) {
    // use subdomain to determine which app to serve: www. as default, or admin. or api
    let subapp = this.hostname.split('.')[0]; // subdomain = part before first '.' of hostname

    switch (subapp) {
        case 'admin':
            var adminApp = composer(require('./apps/admin/app-admin.js'));
            return yield adminApp.call(this, next);
        case 'api':
            var apiApp   = composer(require('./apps/api/app-api.js'));
            return yield apiApp.call(this, next);
        case 'www':
            var wwwApp   = composer(require('./apps/www/app-www.js'));
            return yield wwwApp.call(this, next);
        default: // no subdomain? canonicalise hostname to www.hostname
            this.redirect(this.protocol+'://'+'www.'+this.host+this.path+this.search);
            break;
    }
});
// composer for sub-apps: github.com/koajs/examples/blob/master/vhost
function composer(app) {
    let middleware = app instanceof koa ? app.middleware : app;
    return compose(middleware);
}


if (!module.parent) {
    app.listen(process.env.PORT||3000);
    let db = require('./config/db-'+app.env+'.json').db.database;
    console.log(process.version+' listening on port '+(process.env.PORT||3000)+' ('+app.env+'/'+db+')');
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
