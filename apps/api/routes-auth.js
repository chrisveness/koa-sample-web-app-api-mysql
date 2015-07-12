/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle authentication /auth element                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let router = require('koa-router')(); // router middleware for koa
let crypto = require('crypto');       // nodejs.org/api/crypto.html


/**
 * Get user authentication token {id, token} for subsequent API requests.
 *
 * The token is simply a hash of the timestamp the token was issued.
 *
 * Subsequent requests will be made with basic auth username = id, password = token.
 *
 * Note validation for /auth is by email+pw using bcrypt.compare which is slow, so auth is done once
 * and token is retained temporarily by client; subsequent requests have a fast check of the token.
 */
router.get('/auth', function* getAuth() {
    // (middleware has already validated user at this point, just return the hashed token timestamp)

    // the stored api token is the issue timestamp; the token given out is its sha1 hash
    let token = crypto.createHash('sha1').update(this.auth.user.ApiToken).digest('hex');

    this.body = { id: this.auth.user.UserId, token: token };
    this.body.root = 'auth';
});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
