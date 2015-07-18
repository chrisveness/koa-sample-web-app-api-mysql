/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Login handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let passport = require('koa-passport'); // authentication

let handler = module.exports = {};


/**
 * GET /login - render login page
 *
 * Allow url after the 'login', to specify a redirect after a successful login
 */
handler.getLogin = function*() {
    let context = this.flash.formdata || {}; // failed login? fill in previous values

    yield this.render('login/templates/login', context);
};


/**
 * GET /logout - logout user
 */
handler.getLogout = function*() {
    this.logout();
    this.session = null;
    this.redirect('/');
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * POST /login - process login
 */
handler.postLogin = function* postLogin(next) {
    try {
        // qv github.com/rkusa/koa-passport/blob/master/test/authenticate.js
        // for remember-me function, qv examples in github.com/jaredhanson/passport-local

        let ctx = this; // capture 'this' to pass into callback

        yield* passport.authenticate('local', function*(err, user) {
            if (err) this.throw(err.status||500, err.message);
            if (user) {
                // passport successfully authenticated user: log them in
                yield ctx.login(user);

                // if 'remember-me', set cookie for 1 month, otherwise set session only
                ctx.session.maxAge = ctx.request.body['remember-me'] ? 1000*60*60*24*30 : 0;

                // if we were provided with a redirect URL after the /login, redirect there, otherwise /
                let url = ctx.captures[0] ? ctx.captures[0] : '/';
                if (ctx.request.search) url += ctx.request.search;
                ctx.redirect(url);
            } else {
                // login failed: redisplay login page with login fail message
                let loginfailmsg = 'E-mail / password not recognised';
                ctx.flash = { formdata: ctx.request.body, loginfailmsg: loginfailmsg };
                ctx.redirect(ctx.url);
            }
        }).call(this, next);

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
