/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Members routes                                                                                 */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint space-in-parens: off */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import members from './members.js';


router.get(   '/members',     members.getMembers);       // list members
router.get(   '/members/:id', members.getMemberById);    // get member details
router.post(  '/members',     members.postMembers);      // add new member
router.patch( '/members/:id', members.patchMemberById);  // update member details
router.delete('/members/:id', members.deleteMemberById); // delete member


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
