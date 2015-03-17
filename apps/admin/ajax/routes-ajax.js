/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routing for ajax calls                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

var router  = require('koa-router')(); // router middleware for koa

let request = require('koa-request');  // simplified HTTP request client
let crypto  = require('crypto');       // nodejs.org/api/crypto.html

let User    = require('../../../models/user.js');


// ajax routes pass on requests to API using passport login credentials
// eg GET admin.app.com/ajax/members/123456 => GET api.app.com/members/123456
router.all(/\/ajax\/(.*)/, function* getAjax() {
    // if api token has expired, renew it for api authentication
    let usr = this.passport.user;
    if (usr.ApiToken==null || Date.now()-Date.parse(usr.ApiToken)>1000*60*60*24) {
        yield User.update(usr.UserId, { ApiToken: new Date().toISOString() });
        this.passport.user = yield User.get(usr.UserId);
    }

    let resource = this.captures[0]; // regex capture group; part of url following '/ajax/'
    let host = this.host.replace('admin', 'api');
    let user = this.passport.user.UserId.toString();
    let pass = crypto.createHash('sha1').update(this.passport.user.ApiToken).digest('hex');
    let req = {
        method: this.method,
        url:    this.protocol+'://'+host+'/'+resource,
        form:   this.request.body,
        auth:   { user: user, pass: pass }
    };

    try {

        // make http request to api
        let response = yield request(req);

        // return api response
        this.status = response.statusCode;
        this.body = JSON.parse(response.body);

    } catch (e) {
        this.status = 500;
        this.body = e.message;
    }
});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
