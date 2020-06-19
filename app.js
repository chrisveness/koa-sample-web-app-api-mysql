/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Simple app to explore Node.js + Koa + MySQL basics for CRUD admin + API                        */
/*                                                                                                */
/* App comprises three (composed) sub-apps:                                                       */
/*  - www.   (public website pages)                                                               */
/*  - admin. (pages for interactively managing data)                                              */
/*  - api.   (RESTful CRUD API)                                                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint no-shadow:off *//* app is already declared in the upper scope */

import Koa      from 'koa';          // Koa framework
import compose  from 'koa-compose';  // middleware composer
import compress from 'koa-compress'; // HTTP compression
import session  from 'koa-session';  // session for flash messages

const app = new Koa();


/* set up middleware which will be applied to each request - - - - - - - - - - - - - - - - - - -  */


// return response time in X-Response-Time header
app.use(async function responseTime(ctx, next) {
    const t1 = Date.now();
    await next();
    const t2 = Date.now();
    ctx.response.set('X-Response-Time', Math.ceil(t2-t1)+'ms');
});


// HTTP compression
app.use(compress({}));


// set signed cookie keys for JWT cookie & session cookie
app.keys = [ 'koa-sample-app' ];

// session for flash messages [& compose] (uses signed session cookies, with no server storage)
app.use(session(app));


/* set up sub-apps - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

// select sub-app (admin/api) according to host subdomain (could also be by analysing request.url);
// separate sub-apps can be used for modularisation of a large system, for different login/access
// rights for public/protected elements, and also for different functionality between api & web
// pages (content negotiation, error handling, handlebars templating, etc).

app.use(async function subApp(ctx, next) {
    // use subdomain to determine which app to serve: www. as default, or admin. or api
    ctx.state.subapp = ctx.request.hostname.split('.')[0]; // subdomain = part before first '.' of hostname
    // note: could use root part of path instead of sub-domains e.g. ctx.request.url.split('/')[1]
    await next();
});

import appAdmin from './app-admin/app-admin.js';
import appApi   from './app-api/app-api.js';
import appWww   from './app-www/app-www.js';

app.use(async function composeSubapp(ctx) { // note no 'next' after composed subapp
    switch (ctx.state.subapp) {
        case 'admin': await compose(appAdmin.middleware)(ctx); break;
        case 'api':   await compose(appApi.middleware)(ctx);   break;
        case 'www':   await compose(appWww.middleware)(ctx);   break;
        default: // no (recognised) subdomain? canonicalise host to www.host
            // note switch must include all registered subdomains to avoid potential redirect loop
            ctx.response.redirect(ctx.request.protocol+'://'+'www.'+ctx.request.host+ctx.path+ctx.search);
            break;
    }
});


/* create server - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


app.listen(process.env.PORT||3000);
console.info(`${process.version} listening on port ${process.env.PORT||3000} (${app.env})`);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default app;
