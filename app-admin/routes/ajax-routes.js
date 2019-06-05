/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Routing for ajax calls                                                                         */
/*                                                                                                */
/* This holds app-specific ajax calls (none specified in this sample app), and passes through     */
/* other generic requests to the API.                                                             */
/*                                                                                                */
/* Being placed after auth test in the middleware stack, ajax calls are password-protected.       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import ajax from '../handlers/ajax.js';


/*
 * App-specific ajax routes go here; this sample app has none (except /dev/ajax).
 */


/*
 * ajaxApiPassthrough() makes generic api functionality available to ajax calls.
 */
router.all(/^\/ajax\/(.*)/, ajax.ajaxApiPassthrough);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
