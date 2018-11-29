/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Teams routes                                                                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint space-in-parens: off */

import Router from 'koa-router'; // router middleware for koa

const router = new Router();

import teams  from './teams.js';


router.get(   '/teams',       teams.getTeams);           // list teams
router.get(   '/teams/:id',   teams.getTeamById);        // get team details
router.post(  '/teams',       teams.postTeams);          // add new team
router.patch( '/teams/:id',   teams.patchTeamById);      // update team details
router.delete('/teams/:id',   teams.deleteTeamById);     // delete team


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default router.middleware();
