/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Login handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const passport = require('koa-passport'); // authentication


class LoginHandlers {

    /**
     * GET /login - render login page
     *
     * Allow url after the 'login', to specify a redirect after a successful login
     */
    static async getLogin(ctx) {
        const context = ctx.flash.formdata || {}; // failed login? fill in previous values

        await ctx.render('login', context);
    }


    /**
     * GET /logout - logout user
     */
    static getLogout(ctx) {
        ctx.logout();
        ctx.session = null;
        ctx.redirect('/');
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /login - process login
     */
    static postLogin(ctx, next) {
        // qv github.com/rkusa/koa-passport-example/blob/master/server.js#L32
        // for remember-me function, qv examples in github.com/jaredhanson/passport-local

        return passport.authenticate('local', function(err, user) {
            if (user) {
                // passport successfully authenticated user: log them in
                ctx.login(user);

                // if 'remember-me', set cookie for 1 month, otherwise set session only
                ctx.session.maxAge = ctx.request.body['remember-me'] ? 1000*60*60*24*30 : 0;

                // if we were provided with a redirect URL after the /login, redirect there, otherwise /
                let url = ctx.captures[0] ? ctx.captures[0] : '/';
                if (ctx.request.search) url += ctx.request.search;
                ctx.redirect(url);
            } else {
                // login failed: redisplay login page with login fail message
                const loginfailmsg = 'E-mail / password not recognised';
                ctx.flash = { formdata: ctx.request.body, loginfailmsg: loginfailmsg };
                ctx.redirect(ctx.url);
            }
        })(ctx, next);
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = LoginHandlers;
