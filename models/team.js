/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Team model                                                                                     */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


let Lib        = require('../lib/lib.js');
let ModelError = require('./modelerror.js');

let Team = module.exports = {};


/**
 * Returns Team details (convenience wrapper for single Team details).
 *
 * @param   {number} id - Team id or undefined if not found.
 * @returns {Object} Team details.
 */
Team.get = function*(id) {
    let result = yield GLOBAL.db.query('Select * From Team Where TeamId = ?', id);
    let teams = result[0];
    return teams[0];
};


/**
 * Returns Teams with given field matching given value (convenience wrapper for simple filter).
 *
 * @param   {string}        field - Field to be matched.
 * @param   {string!number} value - Value to match against field.
 * @returns {Object[]}      Teams details.
 */
Team.getBy = function*(field, value) {
    try {

        let sql = `Select * From Team Where ${field} = ? Order By Name`;

        let result = yield GLOBAL.db.query(sql, value);
        let teams = result[0];

        return teams;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': throw ModelError(406, 'Unrecognised Team field '+field);
            default: Lib.logException('Member.getBy', e); throw ModelError(500, e.message);
        }
    }
};


/**
 * Creates new Team record.
 *
 * @param   {Object} values - Team details.
 * @returns {number} New team id.
 * @throws  Error on validation or referential integrity errors.
 */
Team.insert = function*(values) {
    try {

        let result = yield GLOBAL.db.query('Insert Into Team Set ?', values);
        //console.log('Team.insert', result.insertId, new Date); // eg audit trail?
        return result[0].insertId;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                // recognised errors for Team.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('Team.insert', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Update Team details.
 *
 * @param  {number} id - Team id.
 * @param  {Object} values - Team details.
 * @throws Error on referential integrity errors.
 */
Team.update = function*(id, values) {
    try {

        yield GLOBAL.db.query('Update Team Set ? Where TeamId = ?', [values, id]);
        //console.log('Team.update', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
            case 'ER_NO_REFERENCED_ROW_2':
                // recognised errors for Team.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('Team.update', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Delete Team record.
 *
 * @param  {number} id - Team id.
 * @throws Error on referential integrity errors.
 */
Team.delete = function*(id) {
    try {

        yield GLOBAL.db.query('Delete From Team Where TeamId = ?', id);
        //console.log('Team.delete', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
                // related record exists in TeamMember
                throw ModelError(403, 'Cannot delete team with members'); // Forbidden
            default:
                Lib.logException('Team.delete', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
