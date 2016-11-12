/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routing for ajax calls                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router  = require('koa-router')(); // router middleware for koa

const base64  = require('base-64');      // base64 encoder/decoder compatible with atob/btoa
const fetch   = require('node-fetch');   // window.fetch in node.js
const crypto  = require('crypto');       // nodejs.org/api/crypto.html

const User    = require('../../../models/user.js');

/*
 * This provides an interface to the 'api' app, hence providing a RESTful-structured ajax service;
 * e.g. GET admin.app.com/ajax/members/123456 => GET api.app.com/members/123456
 *
 * Being placed after passport in the middleware stack, ajax calls are password-protected.
 *
 * If necessary, it sets up the api token in the same manner as a call to the API resource /auth.
 *
 * TODO: invoke app.listen() directly, instead of going out through http call (use superagent?).
 */
router.all(/\/ajax\/(.*)/, function* getAjax() {
    // if api token has expired, renew it for api authentication
    const usr = this.passport.user;
    if (usr.ApiToken==null || Date.now()-Date.parse(usr.ApiToken)>1000*60*60*24) {
        yield User.update(usr.UserId, { ApiToken: new Date().toISOString() });
        this.passport.user = yield User.get(usr.UserId);
    }

    const resource = this.captures[0]; // regex capture group; part of url following '/ajax/'
    const host = this.host.replace('admin', 'api');
    const url = this.protocol+'://'+host+'/'+resource;

    const body = JSON.stringify(this.request.body)=='{}' ? '' : JSON.stringify(this.request.body);
    const user = this.passport.user.UserId.toString();
    const pass = crypto.createHash('sha1').update(this.passport.user.ApiToken).digest('hex');
    const hdrs = {
        'Content-Type':  'application/json',
        'Accept':         this.header.accept,
        'Authorization': 'Basic '+base64.encode(user+':'+pass)
    };

    const response = yield fetch(url, { method: this.method, body: body, headers: hdrs });
    if (!response.ok) this.throw(response.status, yield response.text()); // response.ok = 2xx status

    this.status = response.status;
    this.body = yield response.json();
});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
