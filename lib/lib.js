/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Library of assorted useful functions                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* jshint esnext:true, node:true */
'use strict';


const Lib = module.exports = {};


/**
 * Log or notify unhandled exception.
 *
 * @param method
 * @param e
 */
Lib.logException = function(method, e) {
    /* eslint no-console: 0 */
    // could eg save to log file or e-mail developer
    console.log('UNHANDLED EXCEPTION', method, e.stack===undefined?e.message:e.stack);
};

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
