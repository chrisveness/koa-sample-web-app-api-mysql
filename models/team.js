/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Team model                                                                                     */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Model from './model-super.js';


class Team extends Model {

    /**
     * Returns Team details (convenience wrapper for single Team details).
     *
     * @param   {number} id - Team id.
     * @returns {Object} Team details or undefined if not found.
     */
    static async get(id) {
        return await super.get('Team', id);
    }


    /**
     * Returns Teams with given field matching given value (convenience wrapper for simple filter).
     *
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Teams details.
     */
    static async getBy(field, value) {
        return await super.getBy('Team', field, value);
    }


    /**
     * Creates new Team record.
     *
     * @param   {Object} values - Team details.
     * @param   {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @returns {number} New team id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values, connection=undefined) {
        return await super.insert('Team', values, connection);
    }


    /**
     * Update Team details.
     *
     * @param  {number} id - Team id.
     * @param  {Object} values - Team details.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async update(id, values, connection=undefined) {
        await super.update('Team', id, values, connection);
    }


    /**
     * Delete Team record.
     *
     * @param  {number} id - Team id.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async delete(id, connection=undefined) {
        await super.delete('Team', id, connection);
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Team;
