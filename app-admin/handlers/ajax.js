/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Ajax handlers (invoked by router to return JSON data)                                          */
/*                                                                                                */
/* All functions here should set body, and status if not 200, and should not throw (as that would */
/* invoke the generic admin exception handler which would return an html page).                   */
/*                                                                                                */
/* Generic ajax functionality gets passed through to be handled by the API via the                */
/* ajaxApiPassthrough() function.                                                                 */
/*                                                                                                */
/* Being placed after passport in the middleware stack, admin ajax calls are password-protected.  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const fetch  = require('node-fetch'); // window.fetch in node.js
const crypto = require('crypto');     // nodejs.org/api/crypto.html

const User = require('../../models/user.js');

const handler = {};


/*
 * Routes/handlers for app-specific ajax calls can go here; this sample app has none.
 */


/*
 * This provides an interface to the 'api' app, hence providing a RESTful-structured ajax service;
 * e.g. GET admin.app.com/ajax/members/123456 => GET api.app.com/members/123456
 *
 * If necessary, it sets up the api token in the same manner as a call to the API resource /auth.
 */
handler.ajaxApiPassthrough = async function(ctx) {
    // if api token has expired, renew it for api authentication
    const usr = ctx.state.user;
    if (usr.ApiToken==null || Date.now()-Date.parse(usr.ApiToken)>1000*60*60*24) {
        await User.update(usr.UserId, { ApiToken: new Date().toISOString() });
        ctx.state.user = await User.get(usr.UserId);
    }

    const resource = ctx.captures[0]; // regex capture group; part of url following '/ajax/'
    const host = ctx.host.replace('admin', 'api');
    const url = ctx.protocol+'://'+host+'/'+resource;

    const body = JSON.stringify(ctx.request.body)=='{}' ? '' : JSON.stringify(ctx.request.body);
    const user = ctx.state.user.UserId.toString();
    const pass = crypto.createHash('sha1').update(ctx.state.user.ApiToken).digest('hex');
    const hdrs = {
        'Content-Type':  'application/json',
        'Accept':        ctx.header.accept,
        'Authorization': 'Basic '+base64Encode(user+':'+pass),
    };

    try {
        const response = await fetch(url, { method: ctx.method, body: body, headers: hdrs });
        const json = response.headers.get('content-type').match(/application\/json/);
        ctx.status = response.status;
        ctx.body = json ? await response.json() : await response.text();
    } catch (e) { // eg offline, DNS fail, etc
        ctx.status = 500;
        ctx.body = e.message;
    }
};


function base64Encode(str) {
    return new Buffer(str, 'binary').toString('base64');
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = handler;
