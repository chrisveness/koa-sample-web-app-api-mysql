/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Team-members routes                                                                            */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint space-in-parens: off */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import teams  from './team-members.js';


router.get(   '/team-members/:id',   teams.getTeamMemberById);        // get team membership details
router.post(  '/team-members',       teams.postTeamMembers);          // add new team membership
router.delete('/team-members/:id',   teams.deleteTeamMemberById);     // delete team membership


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
