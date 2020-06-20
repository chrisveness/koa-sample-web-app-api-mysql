/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Member model                                                                                   */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Model      from './model-super.js';
import ModelError from './modelerror.js';


class Member extends Model {

    /**
     * Returns Member details (convenience wrapper for single Member details).
     *
     * @param   {number} id - Member id.
     * @returns {Object} Member details or undefined if not found.
     */
    static async get(id) {
        return await super.get('Member', id);
    }


    /**
     * Returns Members with given field matching given value (convenience wrapper for simple filter).
     *
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Members details.
     */
    static async getBy(field, value) {
        return await super.getBy('Member', field, value);
    }


    /**
     * Creates new Member record.
     *
     * @param   {Object} values - Member details.
     * @param   {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @returns {number} New member id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values, connection=undefined) {
        // validation - somewhat artificial example serves to illustrate principle of app-level validation
        // (simple mandatory fields can be implemented by HTML 'required' & db 'NOT NULL')
        if (!values.Firstname && !values.Lastname) throw new ModelError(403, 'Firstname or Lastname must be supplied');

        return await super.insert('Member', values, connection);
    }


    /**
     * Update Member details.
     *
     * @param  {number} id - Member id.
     * @param  {Object} values - Member details.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on validation or referential integrity errors.
     */
    static async update(id, values, connection=undefined) {
        return await super.update('Member', id, values, connection);
    }


    /**
     * Delete Member record.
     *
     * @param  {number} id - Member id.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async delete(id, connection=undefined) {
        return await super.delete('Member', id, connection);
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Member;
