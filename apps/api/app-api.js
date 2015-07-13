/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* API app - GET / POST / PATCH / DELETE for Members & Teams                                      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let koa       = require('koa');        // Koa framework
let basicAuth = require('basic-auth'); // basic access authentication
let xmlify    = require('xmlify');     // JS object to XML
let yaml      = require('js-yaml');    // JS object to YAML
let bunyan    = require('bunyan');     // logging
let koaLogger = require('koa-bunyan'); // logging

let validate  = require('./validate.js');

let app = module.exports = koa();


// logging
let access = { type: 'rotating-file', path: './logs/api-access.log', level: 'trace', period: '1d', count: 4 };
let error  = { type: 'rotating-file', path: './logs/api-error.log',  level: 'error', period: '1d', count: 4 };
let logger = bunyan.createLogger({ name: 'api', streams: [ access, error ] });
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


// handle thrown or uncaught exceptions anywhere down the line
app.use(function* handleErrors(next) {
    try {

        yield next;

    } catch (e) {
        switch (e.status) {
            case 204: // No Content
                this.status = e.status;
                break;
            case 401: // Unauthorized
                this.status = e.status;
                this.set('WWW-Authenticate', 'Basic');
                break;
            default: // report 500 Internal Server Error
                this.status = e.status || 500;
                this.body = app.env=='development' ? e.stack : e.message;
                this.app.emit('error', e, this); // github.com/koajs/examples/blob/master/errors/app.js
        }
    }
});


// content negotiation: api will respond with json, xml, or yaml
app.use(function* contentNegotiation(next) {

    yield next;

    if (!this.body) return; // no content to return

    // check Accept header for preferred response type
    let type = this.accepts('json', 'xml', 'text');

    switch (type) {
        case false:
            this.throw(406); // "Not acceptable" - can't furnish whatever was requested
            break;
        case 'json':
            delete this.body.root; // xml root element
            break; // ... koa takes care of type
        case 'xml':
            this.type = type;
            var root = this.body.root; // xml root element
            delete this.body.root;
            this.body = xmlify(this.body, root);
            break;
        case 'text':
        default:
            delete this.body.root; // xml root element
            this.type = 'yaml'; // TODO yaml or just text? depends?
            this.body = yaml.dump(this.body);
            break;
    }
});


// ------------ routing

// public (unsecured) modules first

app.use(require('./routes-root.js'));

// verify basic access authentication; for production use, this should always be over SSL (note
// digest access authentication is not suitable due to password hash constraints: see e.g.
// stackoverflow.com/questions/18551954#answer-18828089)

app.use(function* confirmBasicAuth(next) {
    let user = null;

    // basic auth headers provided?
    let credentials = basicAuth(this.request);
    if (!credentials) this.throw(401); // Unauthorized

    if (this.url == '/auth') {
        // /auth authenticates off email + cleartext password
        user = yield validate.userByEmail(credentials.name, credentials.pass);
        if (!user) this.throw(401); // Unauthorized
    } else {
        // all other resources authenticate off id + token (following auth request)
        user = yield validate.userById(credentials.name, credentials.pass);
        if (!user) this.throw(401); // Unauthorized
    }

    // ok - record authenticated user in this.auth.user
    this.auth = { user: user };

    // and continue on
    yield next;

});

// subsequent modules require authentication

app.use(require('./routes-auth.js'));
app.use(require('./routes-members.js'));
app.use(require('./routes-teams.js'));


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
