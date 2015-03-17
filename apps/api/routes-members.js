/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Members routes                                                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

var router = require('koa-router')(); // router middleware for koa

let members = require('./handlers-members.js');


router.get(   '/members',     members.getMembers);       // list members
router.get(   '/members/:id', members.getMemberById);    // get member details
router.post(  '/members',     members.postMembers);      // add new member
router.patch( '/members/:id', members.patchMemberById);  // update member details
router.delete('/members/:id', members.deleteMemberById); // delete member


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
