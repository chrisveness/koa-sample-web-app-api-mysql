/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Login routes                                                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import login from '../handlers/login.js';


// note url allowed after '/login' to redirect to after successful login
router.get(/\/login(.*)/,  login.getLogin);    // render login page
router.get('/logout',      login.getLogout);   // log user out

router.post(/\/login(.*)/, login.postLogin);   // process login


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
