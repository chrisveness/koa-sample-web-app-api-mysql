/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* User model; users allowed to access the system                                                 */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Lib        = require('../lib/lib.js');
const ModelError = require('./modelerror.js');


class User {

    /**
     * Returns User details (convenience wrapper for single User details).
     *
     * @param   {number} id - User id or undefined if not found.
     * @returns {Object} User details.
     */
    static async get(id) {
        const [users] = await global.db.query('Select * From User Where UserId = :id', { id });
        const user = users[0];
        return user;
    }


    /**
     * Returns Users with given field matching given value.
     *
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Users details.
     */
    static async getBy(field, value) {
        try {

            const sql = `Select * From User Where ${field} = :${field} Order By Firstname, Lastname`;

            const [users] = await global.db.query(sql, { [field]: value });

            return users;

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': throw new ModelError(403, 'Unrecognised User field '+field);
                default: Lib.logException('User.getBy', e); throw new ModelError(500, e.message);
            }
        }
    }


    /**
     * Creates new User record.
     *
     * @param   {Object} values - User details.
     * @returns {number} New user id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values) {
        try {

            const [result] = await global.db.query('Insert Into User Set ?', [values]);
            //console.log('User.insert', result.insertId, new Date); // eg audit trail?
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
                    Lib.logException('User.insert', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Update User details.
     *
     * @param  {number} id - User id.
     * @param  {Object} values - User details.
     * @throws Error on referential integrity errors.
     */
    static async update(id, values) {
        try {

            await global.db.query('Update User Set ? Where UserId = ?', [ values, id ]);
            //console.log('User.update', id, new Date); // eg audit trail?

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
                    Lib.logException('User.update', e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Delete User record.
     *
     * @param  {number} id - User id.
     * @throws Error
     */
    static async delete(id) {
        try {

            await global.db.query('Delete From User Where UserId = id', { id });
            //console.log('User.delete', id, new Date); // eg audit trail?

        } catch (e) {
            switch (e.code) {
                default:
                    Lib.logException('User.delete', e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }


}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = User;
