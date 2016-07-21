/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routes for bunyan logs                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const router  = require('koa-router')();     // router middleware for koa

const spawn   = require('co-child-process'); // spawn a child process using co
const path    = require('path');             // nodejs.org/api/path.html


// logs - quick'n'dirty visibility of bunyan logs
router.get('/logs/:logfile', function* logs() {
    if (this.passport.user.Role != 'su') return this.redirect('/login'+this.url);
    const bunyan = require.resolve('bunyan/bin/bunyan');
    const logfile = path.join(__dirname, '../../../logs/'+this.params.logfile);
    const args = this.query.options ? [logfile, this.query.options] : [logfile];

    try {

        const log = yield spawn(bunyan, args);
        yield this.render('templates/logs', { bunyan: log, logfile: this.params.logfile });

    } catch (e) {
        yield this.render('templates/logs', { bunyan: e.message, logfile: this.params.logfile });
    }

});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
