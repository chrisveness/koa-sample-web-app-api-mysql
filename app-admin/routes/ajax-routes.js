/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Routing for ajax calls                                                                         */
/*                                                                                                */
/* This holds app-specific ajax calls (none specified in this sample app), and passes through     */
/* other generic requests to the API.                                                             */
/*                                                                                                */
/* Being placed after auth test in the middleware stack, ajax calls are password-protected.       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router  = require('koa-router')(); // router middleware for koa

const ajax = require('../handlers/ajax.js');


/*
 * App-specific ajax routes go here; this sample app has none.
 */


/*
 * ajaxApiPassthrough() makes generic api functionality available to ajax calls.
 */
router.all(/\/ajax\/(.*)/, ajax.ajaxApiPassthrough);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
