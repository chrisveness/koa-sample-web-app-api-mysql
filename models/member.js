/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Member model                                                                                   */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');

const Member = module.exports = {};


/**
 * Returns Member details (convenience wrapper for single Member details).
 *
 * @param   {number} id - Member id or undefined if not found.
 * @returns {Object} Member details.
 */
Member.get = function*(id) {
    const result = yield GLOBAL.db.query('Select * From Member Where MemberId = ?', id);
    const members = result[0];
    return members[0];
};


/**
 * Returns Members with given field matching given value (convenience wrapper for simple filter).
 *
 * @param   {string}        field - Field to be matched.
 * @param   {string!number} value - Value to match against field.
 * @returns {Object[]}      Members details.
 */
Member.getBy = function*(field, value) {
    try {

        const sql = `Select * From Member Where ${field} = ? Order By Firstname, Lastname`;

        const result = yield GLOBAL.db.query(sql, value);
        const members = result[0];

        return members;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': throw ModelError(403, 'Unrecognised Member field '+field);
            default: Lib.logException('Member.getBy', e); throw ModelError(500, e.message);
        }
    }
};


/**
 * Creates new Member record.
 *
 * @param   {Object} values - Member details.
 * @returns {number} New member id.
 * @throws  Error on validation or referential integrity errors.
 */
Member.insert = function*(values) {
    // validation - somewhat artificial example serves to illustrate principle
    if (values.Firstname==null && values.Lastname==null) {
        throw ModelError(403, 'Firstname or Lastname must be supplied');
    }

    try {

        const result = yield GLOBAL.db.query('Insert Into Member Set ?', values);
        //console.log('Member.insert', result.insertId, new Date); // eg audit trail?
        return result[0].insertId;

    } catch (e) {
        switch (e.code) {
            // recognised errors for Member.update - just use default MySQL messages for now
            case 'ER_BAD_NULL_ERROR':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                throw ModelError(403, e.message); // Forbidden
            case 'ER_DUP_ENTRY':
                throw ModelError(409, e.message); // Conflict
            default:
                Lib.logException('Member.insert', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Update Member details.
 *
 * @param  {number} id - Member id.
 * @param  {Object} values - Member details.
 * @throws Error on validation or referential integrity errors.
 */
Member.update = function*(id, values) {
     // validation - somewhat artificial example serves to illustrate principle
    if (values.Firstname==null && values.Lastname==null) {
        throw ModelError(403, 'Firstname or Lastname must be supplied');
    }

    try {

        yield GLOBAL.db.query('Update Member Set ? Where MemberId = ?', [values, id]);
        //console.log('Member.update', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
            case 'ER_NO_REFERENCED_ROW_2':
                // recognised errors for Member.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('Member.update', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Delete Member record.
 *
 * @param  {number} id - Member id.
 * @throws Error on referential integrity errors.
 */
Member.delete = function*(id) {
    try {

        yield GLOBAL.db.query('Delete From Member Where MemberId = ?', id);
        //console.log('Member.delete', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_ROW_IS_REFERENCED_': // trailing underscore?
            case 'ER_ROW_IS_REFERENCED_2':
                // related record exists in TeamMember
                throw ModelError(403, 'Member belongs to team(s)'); // Forbidden
            default:
                Lib.logException('Member.delete', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
