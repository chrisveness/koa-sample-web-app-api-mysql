/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Route to handle root element: return uri's for available resources & note on authentication   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')(); // router middleware for koa


router.get('/', function getRoot(ctx) {
    // root element just returns uri's for principal resources (in preferred format)
    const resources = { auth: { _uri: '/auth' }, members: { _uri: '/members' }, teams: { _uri: '/teams' } };
    const authentication = '‘GET /auth’ to obtain JSON Web Token; subsequent requests require JWT auth';
    ctx.body = { resources: resources, authentication: authentication };
    ctx.body.root = 'api';
});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
