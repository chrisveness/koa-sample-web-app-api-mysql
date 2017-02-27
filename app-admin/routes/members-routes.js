/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Members routes                                                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa

const members = require('../handlers/members.js');


router.get('/members',             members.list);          // render list members page
router.get('/members/add',         members.add);           // render add a new member page
router.get('/members/:id',         members.view);          // render view member details page
router.get('/members/:id/edit',    members.edit);          // render edit member details page
router.get('/members/:id/delete',  members.delete);        // render delete a member page

router.post('/members/add',        members.processAdd);    // process add member
router.post('/members/:id/edit',   members.processEdit);   // process edit member
router.post('/members/:id/delete', members.processDelete); // process delete member


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
