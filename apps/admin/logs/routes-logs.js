/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Routes: secure routes for Admin App                                                           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

var router  = require('koa-router')();     // router middleware for koa

let spawn   = require('co-child-process'); // spawn a child process using co
let path    = require('path');             // nodejs.org/api/path.html


// logs - quick'n'dirty visibility of bunyan logs
router.get('/logs/:logfile', function* logs() {
    if (this.passport.user.Role != 'su') return this.redirect('/login'+this.url);
    let bunyan = require.resolve('bunyan/bin/bunyan');
    let logfile = path.join(__dirname, '../../../logs/'+this.params.logfile);
    let args = this.query.options ? [ logfile, this.query.options ] : [ logfile ];

    try {

        let log = yield spawn(bunyan, args);
        yield this.render('logs/templates/logs', { bunyan: log, logfile: this.params.logfile });

    } catch (e) {
        yield this.render('logs/templates/logs', { bunyan: e.message, logfile: this.params.logfile });
    }

});


module.exports = router.middleware();

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
