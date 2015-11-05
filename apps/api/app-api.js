/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* API app - GET / POST / PATCH / DELETE for Members & Teams                                      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const koa       = require('koa');        // Koa framework
const xmlify    = require('xmlify');     // JS object to XML
const yaml      = require('js-yaml');    // JS object to YAML
const bunyan    = require('bunyan');     // logging
const koaLogger = require('koa-bunyan'); // logging

const validate  = require('./validate.js');

const app = module.exports = koa();


// logging
const access = { type: 'rotating-file', path: './logs/api-access.log', level: 'trace', period: '1d', count: 4 };
const error  = { type: 'rotating-file', path: './logs/api-error.log',  level: 'error', period: '1d', count: 4 };
const logger = bunyan.createLogger({ name: 'api', streams: [ access, error ] });
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


// content negotiation: api will respond with json, xml, or yaml
app.use(function* contentNegotiation(next) {

    yield next;

    if (!this.body) return; // no content to return

    // check Accept header for preferred response type
    const type = this.accepts('json', 'xml', 'yaml', 'text');

    switch (type) {
        case 'json':
        default:
            delete this.body.root; // xml root element
            break; // ... koa takes care of type
        case 'xml':
            this.type = type;
            const root = this.body.root; // xml root element
            delete this.body.root;
            this.body = xmlify(this.body, root);
            break;
        case 'yaml':
        case 'text':
            delete this.body.root; // xml root element
            this.type = 'yaml';
            this.body = yaml.dump(this.body);
            break;
        case false:
            this.throw(406); // "Not acceptable" - can't furnish whatever was requested
            break;
    }
});


// handle thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {

        yield next;

    } catch (e) {
        switch (e.status) {
            case 204: // No Content
            case 404: // Not Found
                this.status = e.status;
                break;
            case 401: // Unauthorized
                this.status = e.status;
                this.set('WWW-Authenticate', 'Basic');
                break;
            case 403: // Forbidden
            case 406: // Not Acceptable
            case 409: // Conflict
                this.status = e.status;
                this.body = { error: e.message };
                break;
            default: // report 500 Internal Server Error
                this.status = e.status || 500;
                this.body = app.env=='development' ? e.stack : e.message;
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
        }
    }
});


// ------------ routing

// public (unsecured) modules first

app.use(require('./routes-root.js'));

// if requested url is /auth, require 'user' basic auth (e-mail + password)

app.use(validate.confirmBasicAuthUser('/auth')); // (only applies to /auth)
app.use(require('./routes-auth.js'));

// remaining routes require 'token' basic auth (obtained from /auth)

app.use(validate.confirmBasicAuthToken());
app.use(require('./routes-members.js'));
app.use(require('./routes-teams.js'));


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
