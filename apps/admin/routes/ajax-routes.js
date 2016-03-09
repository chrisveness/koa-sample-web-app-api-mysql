/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routing for ajax calls                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router  = require('koa-router')(); // router middleware for koa

const request = require('koa-request');  // simplified HTTP request client
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
    const user = this.passport.user.UserId.toString();
    const pass = crypto.createHash('sha1').update(this.passport.user.ApiToken).digest('hex');
    const req = {
        method:  this.method,
        url:     this.protocol+'://'+host+'/'+resource,
        form:    this.request.body,
        auth:    { user: user, pass: pass },
        headers: { 'Accept': this.header.accept },
    };

    try {

        // make http request to api
        const response = yield request(req);

        // return api response (parsed json for 2xx, error message otherwise)
        this.status = response.statusCode;
        this.text = response.text;
        this.body = /2../.test(this.status) ? JSON.parse(response.body) : response.body;

    } catch (e) {
        this.status = 500;
        this.body = e.message;
    }
});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
