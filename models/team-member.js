/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TeamMember model                                                                               */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');



class TeamMember {

    /**
     * Returns TeamMember details (convenience wrapper for single TeamMember details).
     *
     * @param   {number} id - TeamMember id or undefined if not found.
     * @returns {Object} TeamMember details.
     */
    static async get(id) {
        const [teamMembers] = await global.db.query('Select * From TeamMember Where TeamMemberId =  :id', { id });
        return teamMembers[0];
    }


    /**
     * Creates new TeamMember record (member joining team).
     *
     * @param   {Object} values - Member details.
     * @returns {number} New member id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values) {
        if (values.JoinedOn instanceof Date) {
            values.JoinedOn = values.JoinedOn.toISOString().replace('T', ' ').split('.')[0];
        }

        try {

            const [result] = await global.db.query('Insert Into TeamMember Set ?', [values]);
            //console.log('TeamMember.insert', result.insertId, new Date); // eg audit trail?
            return result.insertId;

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now (except dup-entry)
                case 'ER_BAD_NULL_ERROR':
                case 'ER_NO_REFERENCED_ROW_2':
                case 'ER_NO_DEFAULT_FOR_FIELD':
                    throw new ModelError(403, e.message); // Forbidden
                case 'ER_DUP_ENTRY':
                    throw new ModelError(409, `Team membership already exists [${values.TeamId}:${values.MemberId}]`); // Conflict
                case 'ER_BAD_FIELD_ERROR':
                    throw new ModelError(500, e.message); // Internal Server Error for programming errors
                default:
                    Lib.logException('TeamMember.insert', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Update TeamMember details.
     *
     * @param  {number} id - TeamMember id.
     * @param  {Object} values - TeamMember details.
     * @throws Error on validation or referential integrity errors.
     */
    static async update(id, values) {
        try {

            await global.db.query('Update TeamMember Set ? Where TeamMemberId = ?', [ values, id ]);
            //console.log('TeamMember.update', id, new Date); // eg audit trail?

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_BAD_NULL_ERROR':
                case 'ER_DUP_ENTRY':
                case 'ER_ROW_IS_REFERENCED_2':
                case 'ER_NO_REFERENCED_ROW_2':
                    throw new ModelError(403, e.message); // Forbidden
                case 'ER_BAD_FIELD_ERROR':
                    throw new ModelError(500, e.message); // Internal Server Error for programming errors
                default:
                    Lib.logException('TeamMember.update', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Delete TeamMember record (cancel team membership).
     *
     * @param  {number} id - TeamMember id.
     * @throws Error on referential integrity errors.
     */
    static async delete(id) {
        try {

            await global.db.query('Delete From TeamMember Where TeamMemberId = :id', { id });
            //console.log('TeamMember.delete', id, new Date); // eg audit trail?

        } catch (e) {
            switch (e.code) {
                case 'ER_ROW_IS_REFERENCED_2':
                    // recognised errors for TeamMember.update - just use default MySQL messages for now
                    throw new ModelError(403, e.message); // Forbidden
                default:
                    Lib.logException('TeamMember.delete', e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = TeamMember;
