/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Team model                                                                                     */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';     // small debugging utility
const debug = Debug('app:db'); // debug db updates

import Db         from '../lib/mysqldb.js';
import Log        from '../lib/log.js';
import ModelError from './modelerror.js';


class Team {

    /**
     * Returns Team details (convenience wrapper for single Team details).
     *
     * @param   {number} id - Team id or undefined if not found.
     * @returns {Object} Team details.
     */
    static async get(id) {
        const [ teams ] = await Db.query('Select * From Team Where TeamId = :id', { id });
        const team = teams[0];
        return team;
    }


    /**
     * Returns Teams with given field matching given value (convenience wrapper for simple filter).
     *
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Teams details.
     */
    static async getBy(field, value) {
        try {

            const sql = `Select * From Team Where ${field} = :${field} Order By Name`;

            const [ teams ] = await Db.query(sql, { [field]: value });

            return teams;

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': throw new ModelError(403, 'Unrecognised Team field '+field);
                default: Log.exception('Member.getBy', e); throw new ModelError(500, e.message);
            }
        }
    }


    /**
     * Creates new Team record.
     *
     * @param   {Object} values - Team details.
     * @returns {number} New team id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values) {
        debug('Team.insert', values.Name);

        try {

            const [ result ] = await Db.query('Insert Into Team Set ?', [ values ]);
            return result.insertId;

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_BAD_NULL_ERROR':
                case 'ER_NO_REFERENCED_ROW_2':
                case 'ER_NO_DEFAULT_FOR_FIELD':
                    throw new ModelError(403, e.message); // Forbidden
                case 'ER_DUP_ENTRY':
                    throw new ModelError(409, e.message); // Conflict
                case 'ER_BAD_FIELD_ERROR':
                    throw new ModelError(500, e.message); // Internal Server Error for programming errors
                default:
                    Log.exception('Team.insert', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Update Team details.
     *
     * @param  {number} id - Team id.
     * @param  {Object} values - Team details.
     * @throws Error on referential integrity errors.
     */
    static async update(id, values) {
        debug('Team.update', id);

        try {

            await Db.query('Update Team Set ? Where TeamId = ?', [ values, id ]);

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
                    Log.exception('Team.update', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Delete Team record.
     *
     * @param  {number} id - Team id.
     * @throws Error on referential integrity errors.
     */
    static async delete(id) {
        debug('Team.delete', id);

        try {

            await Db.query('Delete From Team Where TeamId =  :id', { id });
            return true;

        } catch (e) {
            switch (e.code) {
                case 'ER_ROW_IS_REFERENCED_2': // related record exists in TeamMember
                    throw new ModelError(403, 'Cannot delete team with members'); // Forbidden
                default:
                    Log.exception('Team.delete', e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Team;
