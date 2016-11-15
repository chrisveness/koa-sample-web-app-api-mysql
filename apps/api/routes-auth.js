/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle authentication /auth element                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa
const crypto = require('crypto');       // nodejs.org/api/crypto.html


/**
 * @api {get} /auth Get authentication token for subsequent API requests
 * @apiName   GetAuth
 * @apiGroup  Auth
 *
 * @apiDescription Subsequent requests are made with basic auth username = id, password = token.
 *
 *   Note validation for /auth is by email+pw using scrypt.validateKdf() which is slow, so auth is
 *   done once and token is retained temporarily by client; subsequent requests have a fast check of
 *   the token.
 *
 *   The token has a 24-hour limited lifetime.
 *
 * @apiHeader  Authorization            Basic Access Authentication {email, password}
 * @apiHeader  [Accept=application/xml] application/json, application/xml.
 * @apiSuccess id                       Id to be used for subsequent Authorization header ‘username’
 * @apiSuccess token                    Token to be used for subsequent Authorization header ‘password’
 */
router.get('/auth', function getAuth() {
    // (middleware has already validated user at this point, just return the hashed token timestamp)

    // the stored api token is the issue timestamp; the token given out is its sha1 hash
    const token = crypto.createHash('sha1').update(this.state.auth.user.ApiToken).digest('hex');

    this.body = { id: this.state.auth.user.UserId, token: token };
    this.body.root = 'auth';
});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
