/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'www' app - publicly available parts of the site                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const koa        = require('koa');            // koa framework
const handlebars = require('koa-handlebars'); // handlebars templating
const flash      = require('koa-flash');      // flash messages
const lusca      = require('koa-lusca');      // security header middleware
const serve      = require('koa-static');     // static file serving middleware
const bunyan     = require('bunyan');         // logging
const koaLogger  = require('koa-bunyan');     // logging

const app = module.exports = koa(); // www app


// serve static files (html, css, js); allow browser to cache for 1 hour (note css/js req'd before login)
app.use(serve('public', { maxage: 1000*60*60 }));


// handlebars templating
app.use(handlebars({
    extension:   [ 'html', 'handlebars' ],
    viewsDir:    'app-www/templates',
    partialsDir: 'app-www/templates',
}));


// handle thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {

        yield next;

    } catch (e) {
        this.status = e.status || 500;
        switch (this.status) {
            case 404: // Not Found
                const context404 = { msg: e.message=='Not Found'?null:e.message };
                yield this.render('404-not-found', context404);
                break;
            default:
            case 500: // Internal Server Error
                console.error(e.status||'500', e.message);
                const context500 = app.env=='production' ? {} : { e: e };
                yield this.render('500-internal-server-error', context500);
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
                break;
        }
    }
});


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


// add the domain (host without subdomain) into koa ctx (used in navpartial template)
app.use(function* ctxAddDomain(next) {
    this.state.domain = this.host.replace('www.', '');
    yield next;
});


// logging
const access = { type: 'rotating-file', path: './logs/www-access.log', level: 'trace', period: '1d', count: 4 };
const error  = { type: 'rotating-file', path: './logs/www-error.log',  level: 'error', period: '1d', count: 4 };
const logger = bunyan.createLogger({ name: 'www', streams: [ access, error ] });
app.use(koaLogger(logger, {}));


// ------------ routing

app.use(require('./routes-www.js'));


// end of the line: 404 status for any resource not found
app.use(function* notFound() { // note no 'next'
    this.throw(404);
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
