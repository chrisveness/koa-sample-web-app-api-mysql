/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Public routes (available with no login                                                         */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint space-in-parens: off */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Password reset routes                                                                         */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import passwordReset from '../handlers/password-reset.js';

router.get( '/password/reset-request',         passwordReset.request);        // render request password page
router.post('/password/reset-request',         passwordReset.processRequest); // send password reset e-mail
router.get( '/password/reset-request-confirm', passwordReset.requestConfirm); // render request confirmation page
router.get( '/password/reset/confirm',         passwordReset.resetConfirm);   // render password reset confirmation page
router.get( '/password/reset/:token',          passwordReset.reset);          // render password reset page
router.post('/password/reset/:token',          passwordReset.processReset);   // process password reset


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
