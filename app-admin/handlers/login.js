/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Login handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Scrypt = require('scrypt-kdf');   // scrypt key derivation function
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
        const body = ctx.request.body;

        let [ user ] = await User.getBy('Email', body.username); // lookup user

        // always invoke verify() (whether email found or not) to mitigate against timing attacks on login function
        const passwordHash = user ? user.Password : '0123456789abcdef'.repeat(8);
        let passwordMatch = null;
        try {
            passwordMatch = await Scrypt.verify(passwordHash, body.password);
        } catch (e) {
            user = null; // e.g. "Invalid key"
        }

        if (!user || !passwordMatch) {
            // login failed: redisplay login page with login fail message
            const loginfailmsg = 'E-mail / password not recognised';
            ctx.flash = { formdata: body, loginfailmsg: loginfailmsg };
            return ctx.redirect(ctx.url);
        }

        // submitted credentials validate: create JWT & record it in a cookie to 'log in' user

        const payload = {
            id:       user.UserId,                         // to get user details
            role:     user.Role.slice(0, 1).toLowerCase(), // make role available without db query
            remember: body['remember-me'] ? true : false,  // whether token can be renewed
        };
        const token = jwt.sign(payload, 'koa-sample-app-signature-key', { expiresIn: '24h' });

        // record the jwt payload in ctx.state.user
        ctx.state.user = payload;

        // record token in signed cookie; if 'remember-me', set cookie for 1 week, otherwise set session only
        const options = { signed: true };
        if (body['remember-me']) options.expires = new Date(Date.now() + 1000*60*60*24*7);

        ctx.cookies.set('koa:jwt', token, options);

        // if we were provided with a redirect URL after the /login, redirect there, otherwise /
        ctx.redirect(ctx.url=='/login' ? '/' : ctx.url.replace('/login', ''));
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = LoginHandlers;
