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

import Koa    from 'koa';          // Koa framework
import xmlify from 'xmlify';       // JS object to XML
import yaml   from 'js-yaml';      // JS object to YAML
import Debug  from 'debug';        // small debugging utility

const debug = Debug('app:req'); // debug each request

import Log   from '../lib/log.js';
import Ssl   from '../lib/ssl-middleware.js';
import Auth  from './auth.js';


const app = new Koa(); // API app


// log requests (into mongodb capped collection)
app.use(async function logAccess(ctx, next) {
    debug(ctx.request.method.padEnd(4) + ' ' + ctx.request.url);
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


// ------------ routing


// force use of SSL (redirect http protocol to https)
app.use(Ssl.force({ trustProxy: true }));


// public (unsecured) modules first

import routesRoot from './routes-root.js';
import routesAuth from './routes-auth.js';
app.use(routesRoot);
app.use(routesAuth);

// remaining routes require JWT auth (obtained from /auth and supplied in bearer authorization header)

app.use(Auth.middleware.verifyJwtApi());

import routesMembers     from './routes-members.js';
import routesTeams       from './routes-teams.js';
import routesTeamMembers from './routes-team-members.js';
app.use(routesMembers);
app.use(routesTeams);
app.use(routesTeamMembers);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default app;
