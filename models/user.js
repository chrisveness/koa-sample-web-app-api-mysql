/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* User model; users allowed to access the system                                                 */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


let Lib        = require('../lib/lib.js');
let ModelError = require('./modelerror.js');

let User = module.exports = {};


/**
 * Returns User details (convenience wrapper for single User details).
 *
 * @param   {number} id - User id or undefined if not found.
 * @returns {Object} User details.
 */
User.get = function*(id) {
    let result = yield GLOBAL.db.query('Select * From User Where UserId = ?', id);
    let users = result[0];
    return users[0];
};


/**
 * Returns Users with given field matching given value.
 *
 * @param   {string}        field - Field to be matched.
 * @param   {string!number} value - Value to match against field.
 * @returns {Object[]}      Users details.
 */
User.getBy = function*(field, value) {
    try {

        let sql = `Select * From User Where ${field} = ? Order By Firstname, Lastname`;

        let result = yield GLOBAL.db.query(sql, value);
        let users = result[0];

        return users;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': throw ModelError(406, 'Unrecognised search term');
            default: Lib.logException('User.getBy', e); throw ModelError(500, e.message);
        }
    }
};


/**
 * Creates new User record.
 *
 * @param   {Object} values - User details.
 * @returns {number} New user id.
 * @throws  Error on validation or referential integrity errors.
 */
User.insert = function*(values) {
    try {

        let result = yield GLOBAL.db.query('Insert Into User Set ?', values);
        //console.log('User.insert', result.insertId, new Date); // eg audit trail?
        return result[0].insertId;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                // recognised errors for User.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('User.insert', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Update User details.
 *
 * @param  {number} id - User id.
 * @param  {Object} values - User details.
 * @throws Error on referential integrity errors.
 */
User.update = function*(id, values) {
    try {

        yield GLOBAL.db.query('Update User Set ? Where UserId = ?', [values, id]);
        //console.log('User.update', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
                // recognised errors for User.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('User.update', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Delete User record.
 *
 * @param  {number} id - User id.
 * @throws Error
 */
User.delete = function*(id) {
    try {

        yield GLOBAL.db.query('Delete From User Where TeamId = ?', id);
        //console.log('User.delete', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            default:
                Lib.logException('User.delete', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
