/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* ModelError - error thrown by model includes http status to return when error is thrown in API  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


/**
 * Extend Error with ModelError which includes message and (http) status.
 *
 * @param message Message associated with error
 * @param status  HTTP status for API return status
 * @constructor
 *
 * qv stackoverflow.com/questions/1382107#answer-8460753
 * also: developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/proto
 */
function ModelError(status, message) {
    if (!(this instanceof ModelError)) return new ModelError(status, message);
    Object.setPrototypeOf(this.constructor.prototype, Error.prototype);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.status = status;
    this.message = message;
}

module.exports = ModelError;

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
