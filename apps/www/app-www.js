/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'www' app - publicly available parts of the site                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


let koa        = require('koa');            // koa framework
let handlebars = require('koa-handlebars'); // handlebars templating
let flash      = require('koa-flash');      // flash messages
let helmet     = require('koa-helmet');     // security header middleware
let serve      = require('koa-static');     // static file serving middleware
let bunyan     = require('bunyan');         // logging
let koaLogger  = require('koa-bunyan');     // logging

let app = module.exports = koa(); // API app


// logging
let access = { type: 'rotating-file', path: './logs/www-access.log', level: 'trace', period: '1d', count: 4 };
let error  = { type: 'rotating-file', path: './logs/www-error.log',  level: 'error', period: '1d', count: 4 };
let logger = bunyan.createLogger({ name: 'www', streams: [ access, error ] });
app.use(koaLogger(logger, {}));


// 500 status for thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {

        yield next;

    } catch (e) {
        this.status = e.status || 500;
        let context = app.env=='development' ? { e: e } : {};
        yield this.render('templates/500-internal-server-error', context);
        this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
    }
});


// add the domain (host without subdomain) into koa ctx
app.use(function* ctxAddDomain(next) {
    this.domain = this.host.replace('www.', '');
    yield next;
});


// handlebars templating
app.use(handlebars({
    extension:   ['html', 'handlebars'],
    viewsDir:    'apps/www',
    partialsDir: 'apps/www/templates',
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
app.use(helmet());


// ------------ routing

// serve static files (html, css, js); allow browser to cache for 1 hour (note css/js req'd before login)
app.use(serve('public', { maxage: 1000*60*60 }));

app.use(require('./routes-www.js'));


// end of the line: 404 status for any resource not found
app.use(function* notFound(next) {
    yield next; // actually no next...

    this.status = 404;
    yield this.render('templates/404-not-found');
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
