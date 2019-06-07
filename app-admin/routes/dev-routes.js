/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routes for dev tools                                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import Dev from '../handlers/dev.js';


router.get('/dev/nodeinfo',            Dev.nodeinfo);
router.get('/dev/log-access',          Dev.logAccess);
router.get('/dev/log-error',           Dev.logError);
router.get('/dev/ajax/ip-domain/:ip',  Dev.ajaxIpDomain);
router.get('/dev/table/:table',        Dev.tableInspector);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
