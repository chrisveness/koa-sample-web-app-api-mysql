/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* API app - RESTful API for API interface and/or ajax functions.                                 */
/*                                                                                                */
/* The API provides GET / POST / PATCH / DELETE methods on a variety of resources.                */
/*                                                                                                */
/* 2xx responses honour the request Accept type (json/xml/yaml/text) for the response body;       */
/* 4xx/5xx responses provide a simple text message in the body.                                   */
/*                                                                                                */
/* A GET on a collection which returns no results returns a 204 / No Content response.            */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Koa       = require('koa');          // Koa framework
const jwt       = require('jsonwebtoken'); // JSON Web Token implementation
const xmlify    = require('xmlify');       // JS object to XML
const yaml      = require('js-yaml');      // JS object to YAML

const Log = require('../lib/log.js');


const app = new Koa(); // API app


// log requests (into mongodb capped collection)
app.use(async function logAccess(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();

    await Log.access(ctx, t2 - t1);
});


// content negotiation: api will respond with json, xml, or yaml
app.use(async function contentNegotiation(ctx, next) {
    await next();

    if (!ctx.response.body) return; // no content to return

    // check Accept header for preferred response type
    const type = ctx.request.accepts('json', 'xml', 'yaml', 'text');

    switch (type) {
        case 'json':
        default:
            delete ctx.response.body.root; // xml root element
            break; // ... koa takes care of type
        case 'xml':
            ctx.response.type = type;
            const root = ctx.response.body.root; // xml root element
            delete ctx.response.body.root;
            ctx.response.body = xmlify(ctx.response.body, root);
            break;
        case 'yaml':
        case 'text':
            delete ctx.response.body.root; // xml root element
            ctx.response.type = 'yaml';
            ctx.response.body = yaml.dump(ctx.response.body);
            break;
        case false:
            ctx.throw(406); // "Not acceptable" - can't furnish whatever was requested
            break;
    }
});


// handle thrown or uncaught exceptions anywhere down the line
app.use(async function handleErrors(ctx, next) {
    try {

        await next();

    } catch (err) {
        ctx.response.status = err.status || 500;
        switch (ctx.response.status) {
            case 204: // No Content
                break;
            case 401: // Unauthorized
                ctx.response.set('WWW-Authenticate', 'Basic');
                break;
            case 403: // Forbidden
            case 404: // Not Found
            case 406: // Not Acceptable
            case 409: // Conflict
                ctx.response.body = { message: err.message, root: 'error' };
                break;
            default:
            case 500: // Internal Server Error (for uncaught or programming errors)
                console.error(ctx.response.status, err.message);
                ctx.response.body = { message: err.message, root: 'error' };
                if (app.env != 'production') ctx.response.body.stack = err.stack;
                // ctx.app.emit('error', err, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
        await Log.error(ctx, err);
    }
});


// set up MySQL connection
app.use(async function mysqlConnection(ctx, next) {
    try {

        // keep copy of ctx.state.db in global for access from models
        ctx.state.db = global.db = await global.connectionPool.getConnection();
        ctx.state.db.connection.config.namedPlaceholders = true;
        // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
        await ctx.state.db.query('SET SESSION sql_mode = "TRADITIONAL"');

        await next();

        ctx.state.db.release();

    } catch (e) {
        // note if getConnection() fails we have no this.state.db, but if anything downstream throws,
        // we need to release the connection
        if (ctx.state.db) ctx.state.db.release();
        throw e;
    }
});


// ------------ routing

// public (unsecured) modules first

app.use(require('./routes-root.js'));
app.use(require('./routes-auth.js'));

// remaining routes require JWT auth (obtained from /auth and supplied in bearer authorization header)

app.use(async function verifyJwt(ctx, next) {
    if (!ctx.request.header.authorization) ctx.throw(401, 'Authorisation required');
    const [ scheme, token ] = ctx.request.header.authorization.split(' ');
    if (scheme != 'Bearer') ctx.throw(401, 'Invalid authorisation');

    const roles = { g: 'guest', a: 'admin', s: 'su' };

    try {
        const payload = jwt.verify(token, 'koa-sample-app-signature-key'); // throws on invalid token

        // valid token: accept it...
        ctx.state.user = payload;                  // for user id  to look up user details
        ctx.state.user.Role = roles[payload.role]; // for authorisation checks
    } catch (e) {
        if (e.message == 'invalid token') ctx.throw(401, 'Invalid JWT'); // Unauthorized
        ctx.throw(e.status||500, e.message); // Internal Server Error
    }

    await next();
});

app.use(require('./routes-members.js'));
app.use(require('./routes-teams.js'));
app.use(require('./routes-team-members.js'));


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = app;
