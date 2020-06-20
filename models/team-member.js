/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* TeamMember model                                                                               */
/*                                                                                                */
/* All database modifications go through the model; most querying is in the handlers.             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Model from './model-super.js';


class TeamMember extends Model {

    /**
     * Returns TeamMember details (convenience wrapper for single TeamMember details).
     *
     * @param   {number} id - TeamMember id.
     * @returns {Object} TeamMember details or undefined if not found.
     */
    static async get(id) {
        return await super.get('TeamMember', id);
    }


    /**
     * Creates new TeamMember record (member joining team).
     *
     * @param   {Object} values - Member details.
     * @param   {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @returns {number} New TeamMember id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(values, connection=undefined) {
        return await super.insert('TeamMember', values, connection);
    }


    /**
     * Update TeamMember details.
     *
     * @param  {number} id - TeamMember id.
     * @param  {Object} values - TeamMember details.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on validation or referential integrity errors.
     */
    static async update(id, values, connection=undefined) {
        return await super.update('TeamMember', id, values, connection);
    }


    /**
     * Delete TeamMember record (cancel team membership).
     *
     * @param  {number} id - TeamMember id.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async delete(id, connection=undefined) {
        return await super.delete('TeamMember', id, connection);
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamMember;
