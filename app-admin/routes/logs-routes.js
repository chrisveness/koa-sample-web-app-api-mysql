/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routes for bunyan logs                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router = require('koa-router')();                // router middleware for koa
const spawn  = require('child-process-promise').spawn; // promises wrapper around child_process
const path   = require('path');                        // nodejs.org/api/path.html


// logs - quick'n'dirty visibility of bunyan logs
router.get('/logs/:logfile', async function logs(ctx) {
    if (ctx.state.user.Role != 'su') return ctx.redirect('/login'+ctx.url);

    const bunyan = require.resolve('bunyan/bin/bunyan'); // full path to bunyan command
    const logfile = path.join(__dirname, '../../logs/'+ctx.params.logfile);
    const args = ctx.query.options ? [ logfile, ctx.query.options ] : [logfile];

    try {

        const proc = await spawn(bunyan, [args], { capture: [ 'stdout', 'stderr' ] });

        await ctx.render('logs', { bunyan: proc.stdout, logfile: ctx.params.logfile });

    } catch (e) {
        // log file not found?
        await ctx.render('logs', { bunyan: `Log file ${ctx.params.logfile} not found`, logfile: ctx.params.logfile });
    }

});


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = router.middleware();
