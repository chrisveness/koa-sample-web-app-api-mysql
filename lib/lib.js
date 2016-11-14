/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  Library of assorted useful functions                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Lib = module.exports = {};


/**
 * Log or notify unhandled exception.
 *
 * @param method
 * @param e
 */
Lib.logException = function(method, e) {
    // could eg save to log file or e-mail developer
    console.error('UNHANDLED EXCEPTION', method, e.stack===undefined?e.message:e.stack);
};

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
