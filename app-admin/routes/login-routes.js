/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Login routes                                                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa

const login = require('../handlers/login.js');


// note url allowed after '/login' to redirect to after successful login
router.get(/\/login(.*)/,  login.getLogin);    // render login page
router.get('/logout',      login.getLogout);   // log user out

router.post(/\/login(.*)/, login.postLogin);   // process login


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
