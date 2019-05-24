/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TeamMember model                                                                               */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';     // small debugging utility
const debug = Debug('app:db'); // debug db updates

import Db         from '../lib/mysqldb.js';
import Log        from '../lib/log.js';
import ModelError from './modelerror.js';


class TeamMember {

    /**
     * Returns TeamMember details (convenience wrapper for single TeamMember details).
     *
     * @param   {number} id - TeamMember id or undefined if not found.
     * @returns {Object} TeamMember details.
     */
    static async get(id) {
        const [ teamMembers ] = await Db.query('Select * From TeamMember Where TeamMemberId =  :id', { id });
        return teamMembers[0];
    }


    /**
     * Creates new TeamMember record (member joining team).
     *
     * @param   {Object} values - Member details.
     * @returns {number} New TeamMember id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values) {
        debug('TeamMember.insert');

        if (values.JoinedOn instanceof Date) {
            values.JoinedOn = values.JoinedOn.toISOString().replace('T', ' ').split('.')[0];
        }

        try {

            const [ result ] = await Db.query('Insert Into TeamMember Set ?', [ values ]);
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
                    Log.exception('TeamMember.insert', e);
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
        debug('TeamMember.update', id);

        try {

            await Db.query('Update TeamMember Set ? Where TeamMemberId = ?', [ values, id ]);

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
                    Log.exception('TeamMember.update', e);
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
        debug('TeamMember.delete', id);

        try {

            await Db.query('Delete From TeamMember Where TeamMemberId = :id', { id });
            return true;

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_ROW_IS_REFERENCED_2':
                    throw new ModelError(403, e.message); // Forbidden
                default:
                    Log.exception('TeamMember.delete', e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamMember;
