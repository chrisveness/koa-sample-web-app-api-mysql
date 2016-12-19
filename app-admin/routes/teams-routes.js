/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Members routes                                                                                */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa

const teams = require('../handlers/teams.js');


router.get('/teams',               teams.list);          // render list members page
router.get('/teams/add',           teams.add);           // render add a new member page
router.get('/teams/:id',           teams.view);          // render view member details page
router.get('/teams/:id/edit',      teams.edit);          // render edit member details page
router.get('/teams/:id/delete',    teams.delete);        // render delete a member page

router.post('/teams/add',          teams.processAdd);    // process add member
router.post('/teams/:id/edit',     teams.processEdit);   // process edit member
router.post('/teams/:id/delete',   teams.processDelete); // process delete member


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
