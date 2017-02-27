/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Team-members routes                                                                           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa

const teams  = require('./team-members.js');


router.get(   '/team-members/:id',   teams.getTeamMemberById);        // get team membership details
router.post(  '/team-members',       teams.postTeamMembers);          // add new team membership
router.delete('/team-members/:id',   teams.deleteTeamMemberById);     // delete team membership


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
