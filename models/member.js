/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Member model                                                                                   */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';     // small debugging utility
const debug = Debug('app:db'); // debug db updates

import Db         from '../lib/mysqldb.js';
import Log        from '../lib/log.js';
import ModelError from './modelerror.js';


class Member {

    /**
     * Returns Member details (convenience wrapper for single Member details).
     *
     * @param   {number} id - Member id or undefined if not found.
     * @returns {Object} Member details.
     */
    static async get(id) {
        const [ members ] = await Db.query('Select * From Member Where MemberId = :id', { id });
        const member = members[0];
        return member;
    }


    /**
     * Returns Members with given field matching given value (convenience wrapper for simple filter).
     *
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Members details.
     */
    static async getBy(field, value) {
        try {

            const sql = `Select * From Member Where ${field} = :${field} Order By Firstname, Lastname`;

            const [ members ] = await Db.query(sql, { [field]: value });

            return members;

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR':
                    throw new ModelError(403, 'Unrecognised Member field '+field);
                default:
                    Log.exception('Member.getBy', e);
                    throw new ModelError(500, e.message);
            }
        }
    }


    /**
     * Creates new Member record.
     *
     * @param   {Object} values - Member details.
     * @returns {number} New member id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values) {
        debug('Member.insert', values.Email);

        // validation - somewhat artificial example serves to illustrate principle of app-level validation
        if (values.Firstname==null && values.Lastname==null) {
            throw new ModelError(403, 'Firstname or Lastname must be supplied');
        }

        try {

            const [ result ] = await Db.query('Insert Into Member Set ?', [ values ]);
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
                    Log.exception('Member.insert', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Update Member details.
     *
     * @param  {number} id - Member id.
     * @param  {Object} values - Member details.
     * @throws Error on validation or referential integrity errors.
     */
    static async update(id, values) {
        debug('Member.update', id);

        // validation - somewhat artificial example serves to illustrate principle
        if (values.Firstname==null && values.Lastname==null) {
            throw new ModelError(403, 'Firstname or Lastname must be supplied');
        }

        try {

            await Db.query('Update Member Set ? Where MemberId = ?', [ values, id ]);

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
                    Log.exception('Member.update', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Delete Member record.
     *
     * @param  {number} id - Member id.
     * @throws Error on referential integrity errors.
     */
    static async delete(id) {
        debug('Member.delete', id);

        try {

            await Db.query('Delete From Member Where MemberId = :id', { id });
            return true;

        } catch (e) {
            switch (e.code) {
                case 'ER_ROW_IS_REFERENCED_2': // related record exists in TeamMember
                    throw new ModelError(403, 'Member belongs to team(s)'); // Forbidden
                default:
                    Log.exception('Member.delete', e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Member;
