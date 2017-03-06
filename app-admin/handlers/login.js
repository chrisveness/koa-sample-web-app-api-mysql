/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Login handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const scrypt = require('scrypt');       // scrypt library
const jwt    = require('jsonwebtoken'); // JSON Web Token implementation

const User = require('../../models/user.js');


class LoginHandlers {

    /**
     * GET /login - render login page
     *
     * Allow url after the 'login', to specify a redirect after a successful login
     */
    static async getLogin(ctx) {
        const user = ctx.state.user ? await User.get(ctx.state.user.id) : null;

        await ctx.render('login', { user: user });
    }


    /**
     * GET /logout - logout user
     */
    static getLogout(ctx) {
        ctx.cookies.set('koa:jwt', null, { signed: true }); // delete the cookie holding the JSON Web Token
        ctx.redirect('/');
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /login - process login
     *
     * If user authenticates, create JSON Web Token & record it in a signed cookie for subsequent
     * requests, and record the payload in ctx.state.user.
     *
     * The JWT payload includes the user id, the user’s role so that authorisation checks can be
     * done without a database query (just initial letter so that the role in the token is not too
     * obvious), and whether the token can be renewed for a ‘remember-me’ function.
     */
    static async postLogin(ctx) {
        const username = ctx.request.body.username;
        const password = ctx.request.body.password;

        let [user] = await User.getBy('Email', username); // lookup user

        if (user) { // verify password matches
            try {
                const match = await scrypt.verifyKdf(Buffer.from(user.Password, 'base64'), password);
                if (!match) user = null; // bad password
            } catch (e) {
                user = null; // e.g. "data is not a valid scrypt-encrypted block"
            }
        }

        if (user) {
            // submitted credentials validate: create JWT & record it in a cookie

            const payload = {
                id:       user.UserId,                                    // to get user details
                role:     user.Role.slice(0, 1).toLowerCase(),            // make role available without db query
                remember: ctx.request.body['remember-me'] ? true : false, // whether token can be renewed
            };
            const token = jwt.sign(payload, 'koa-sample-app-signature-key', { expiresIn: '24h' });

            // record the jwt payload in ctx.state.user
            ctx.state.user = payload;

            // record token in signed cookie; if 'remember-me', set cookie for 1 week, otherwise set session only
            const options = { signed: true };
            if (ctx.request.body['remember-me']) options.expires = new Date(Date.now() + 1000*60*60*24*7);

            ctx.cookies.set('koa:jwt', token, options);

            // if we were provided with a redirect URL after the /login, redirect there, otherwise /
            ctx.redirect(ctx.url=='/login' ? '/' : ctx.url.replace('/login', ''));
        } else {
            // login failed: redisplay login page with login fail message
            const loginfailmsg = 'E-mail / password not recognised';
            ctx.flash = { formdata: ctx.request.body, loginfailmsg: loginfailmsg };
            ctx.redirect(ctx.url);
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = LoginHandlers;
