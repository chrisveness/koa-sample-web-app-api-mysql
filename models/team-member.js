/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TeamMember model                                                                               */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';


const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');

const TeamMember = module.exports = {};


/**
 * Returns TeamMember details (convenience wrapper for single TeamMember details).
 *
 * @param   {number} id - TeamMember id or undefined if not found.
 * @returns {Object} TeamMember details.
 */
TeamMember.get = function*(id) {
    const result = yield GLOBAL.db.query('Select * From TeamMember Where TeamMemberId = ?', id);
    const teamMember = result[0];
    return teamMember[0];
};


/**
 * Creates new TeamMember record (member joining team).
 *
 * @param   {Object} values - Member details.
 * @returns {number} New member id.
 * @throws  Error on validation or referential integrity errors.
 */
TeamMember.insert = function*(values) {
    if (values.JoinedOn instanceof Date) {
        values.JoinedOn = values.JoinedOn.toISOString().replace('T', ' ').split('.')[0];
    }

    try {

        const result = yield GLOBAL.db.query('Insert Into TeamMember Set ?', values);
        //console.log('TeamMember.insert', result.insertId, new Date); // eg audit trail?
        return result[0].insertId;

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_NO_REFERENCED_ROW_2':
            case 'ER_NO_DEFAULT_FOR_FIELD':
                // recognised errors for TeamMember.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('TeamMember.insert', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Update TeamMember details.
 *
 * @param  {number} id - TeamMember id.
 * @param  {Object} values - TeamMember details.
 * @throws Error on validation or referential integrity errors.
 */
TeamMember.update = function*(id, values) {
    try {

        const result = yield GLOBAL.db.query('Update TeamMember Set ? Where TeamMemberId = ?', [values, id]);
        if (result.affectedRows == 0) return; // not found
        //console.log('TeamMember.update', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_NULL_ERROR':
            case 'ER_DUP_ENTRY':
            case 'ER_ROW_IS_REFERENCED_2':
            case 'ER_NO_REFERENCED_ROW_2':
                // recognised errors for TeamMember.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('TeamMember.update', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/**
 * Delete TeamMember record (cancel team membership).
 *
 * @param  {number} id - TeamMember id.
 * @throws Error on referential integrity errors.
 */
TeamMember.delete = function*(id) {
    try {

        yield GLOBAL.db.query('Delete From TeamMember Where TeamMemberId = ?', id);
        //console.log('TeamMember.delete', id, new Date); // eg audit trail?

    } catch (e) {
        switch (e.code) {
            case 'ER_ROW_IS_REFERENCED_2':
                // recognised errors for TeamMember.update - just use default MySQL messages for now
                throw ModelError(403, e.message); // Forbidden
            default:
                Lib.logException('TeamMember.delete', e);
                throw ModelError(500, e.message); // Internal Server Error
        }
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
