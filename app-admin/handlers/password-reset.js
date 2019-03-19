/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Password Reset handlers (invoked by router to render templates)                                */
/*                                                                                                */
/* GET functions render template pages; POST functions process post requests then redirect.       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import crypto from 'crypto';     // nodejs.org/api/crypto.html
import Scrypt from 'scrypt-kdf'; // scrypt key derivation function

import User from '../../models/user.js';
import Mail from '../../lib/mail.js';

/*
 * Password reset sequence is:
 * - GET  /password/reset-request
 * - POST /password/reset-request with email; 302 ->
 * - GET  /password/reset-request-confirm
 * - e-mail is sent to 'email' with reset link '/password/reset/{token}'
 * - GET  /password/reset/{token}
 * - POST /password/reset/{token} with password & passwordConfirm; 302 ->
 * - GET  /password/reset/confirm
 */


class PasswordResetHandlers {

    /**
     * GET /password/reset-request - render request password reset page
     */
    static async request(ctx) {
        await ctx.render('password-reset-request');
    }


    /**
     * POST /password/reset-request - process request password reset
     *
     * Send e-mail with password reset link
     */
    static async processRequest(ctx) {
        const email = ctx.request.body.email;

        const [ user ] = await User.getBy('Email', email);

        // current timestamp for token expiry in base36
        const now = Math.floor(Date.now()/1000).toString(36);

        // random sha256 hash; 1st 8 chars of hash in base36 gives 42 bits of entropy
        const hash = crypto.createHash('sha256').update(Math.random().toString());
        const rndHash = parseInt(hash.digest('hex'), 16).toString(36).slice(0, 8);
        const token = now+'-'+rndHash; // note use timestamp first so it is easier to identify old tokens in db

        // note: do createHash() before checking if user exists to mitigate against timing attacks
        if (!user) { ctx.response.redirect('/password/reset-request-confirm'); return; }

        // record reset request in db
        await User.update(user.UserId, { PasswordResetRequest: token });

        // send e-mail with generated token
        const context = { firstname: user.Firstname, host: ctx.request.host, token: token };
        await Mail.send(email, 'password-reset.email', context, ctx);

        ctx.response.set('X-Reset-Token', token); // for testing

        ctx.response.redirect('/password/reset-request-confirm');
    }


    /**
     * GET /password/reset/:token - render password reset page
     */
    static async reset(ctx) {
        const token = ctx.params.token;

        // check token is good
        if (!await userForResetToken(token)) {
            await ctx.render('password-reset', { badToken: true });
            return;
        }

        await ctx.render('password-reset', { valid: true });
    }


    /**
     * GET /password/reset-request-confirm - render request password reset confirmation page
     */
    static async requestConfirm(ctx) {
        await ctx.render('password-reset-request-confirm', { host: ctx.request.host });
    }


    /**
     * POST /password/reset/:token - process password reset
     */
    static async processReset(ctx) {
        const token = ctx.params.token;

        // check token is good
        const user = await userForResetToken(token);
        if (!user) {
            ctx.response.redirect('/password/reset/'+token); // use existing notification mechanism!
            return;
        }

        // passwords match?
        if (ctx.request.body.password != ctx.request.body.passwordConfirm) {
            ctx.flash = { _error: 'Passwords don’t match' };
            ctx.response.redirect('/password/reset/'+token);
            return;
        }

        // set the password and clear the password reset token
        const password = await Scrypt.kdf(ctx.request.body.password, { logN: 15 });
        await User.update(user.UserId, { password: password.toString('base64'), PasswordResetRequest: null });

        ctx.response.redirect('/password/reset/confirm');
    }


    /**
     * GET /password/reset/confirm - render password reset confirmation page
     */
    static async resetConfirm(ctx) {
        await ctx.render('password-reset-confirm');
    }

}


/**
 * Return whether reset token is valid (requested and not expired), and if so returns user details.
 *
 * @param   {string} token - The reset token to be checked.
 * @returns {Object|boolean} User if token is valid, otherwise null.
 */
async function userForResetToken(token) {
    // a valid token contains a single hyphen
    if (token.split('-').length != 2) return null;

    // the token is a timestamp in base36 and a hash separated by a hyphen
    const [ timestamp ] = token.split('-'); // (we don't need the hash here)

    // check token is not expired
    if (Date.now()/1000 - parseInt(timestamp, 36) > 60*60*24) return null;

    // check token has been recorded (and not used)
    const [ user ] = await User.getBy('PasswordResetRequest', token);
    if (!user) return null;

    // all checks out!
    return user;
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default PasswordResetHandlers;
