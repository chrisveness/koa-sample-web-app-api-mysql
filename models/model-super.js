/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* 'Super' model which is extended for individual models.                                         */
/*                                                                                                */
/* Assumes table names are identical to model names, and primary key names are table name + 'Id'. */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Debug from 'debug';     // small debugging utility
const debug = Debug('app:db'); // debug db updates

import Db         from '../lib/mysqldb.js';
import ModelError from './modelerror.js';


class SuperModel {

    /**
     * Returns object details (convenience wrapper for single object details).
     *
     * @param   {string} model - Model / table name.
     * @param   {number} id - Object id.
     * @returns {Object} Object details or undefined if not found.
     */
    static async get(model, id) {
        const sql = `Select * From ${model} Where ${model}Id = :id`;
        const [ [ object ] ] = await Db.execute(sql, { id });
        return object;
    }


    /**
     * Returns Objects with given field matching given value (convenience wrapper for simple filter);
     * note any sorting would have to be done in JavaScript.
     *
     * @param   {string}        model - Model / table name.
     * @param   {string}        field - Field to be matched.
     * @param   {string!number} value - Value to match against field.
     * @returns {Object[]}      Object's details.
     */
    static async getBy(model, field, value) {
        try {

            const sql = `Select * From ${model} Where ${field} = :${field}`;
            const [ objects ] = await Db.execute(sql, { [field]: value });
            return objects;

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': // 1054 unknown column
                    throw new ModelError(403, `Unrecognised ${model} field ${field}`);
                default:
                    console.error(`${model}.getBy`, e);
                    throw new ModelError(500, e.message);
            }
        }
    }


    /**
     * Creates new record.
     *
     * @param   {string} model - Model / table name.
     * @param   {Object} values - Object details.
     * @param   {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @returns {number} New object id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async insert(model, values, connection=undefined) {
        debug(`${model}.insert`, Object.keys(values).join(', ').slice(0, 48)+(Object.keys(values).join(', ').length>48?'...':''));

        try {

            const [ result ] = await Db.query(`Insert Into ${model} Set ?`, [ values ], connection); // TODO: use execute once available: https://github.com/sidorares/node-mysql2/issues/756
            return result.insertId;

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_BAD_NULL_ERROR':       // 1048 column cannot be null
                case 'ER_NO_REFERENCED_ROW':    // 1216 foreign key constraint fails
                case 'ER_NO_REFERENCED_ROW_2':  // 1452 foreign key constraint fails
                case 'ER_NO_DEFAULT_FOR_FIELD': // 1364 field doesn't have a default value
                    throw new ModelError(403, e.message); // Forbidden
                case 'ER_DUP_ENTRY':            // 1062 duplicate entry
                    throw new ModelError(409, e.message); // Conflict
                case 'ER_BAD_FIELD_ERROR':      // 1054 unknown column
                    throw new ModelError(500, e.message); // Internal Server Error for programming errors
                default:
                    console.error(`${model}.insert`, e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Replaces record or inserts new record.
     *
     * @param   {string} model - Model / table name.
     * @param   {Object} values - Object details.
     * @param   {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @returns {number} New object id.
     * @throws  Error on validation or referential integrity errors.
     */
    static async replace(model, values, connection=undefined) {
        debug(`${model}.value`, Object.keys(values).join(', ').slice(0, 48)+(Object.keys(values).join(', ').length>48?'...':''));

        try {

            const [ result ] = await Db.query(`Replace Into ${model} Set ?`, [ values ], connection); // TODO: use execute once available: https://github.com/sidorares/node-mysql2/issues/756
            return result.insertId;

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_BAD_NULL_ERROR':       // 1048 column cannot be null
                case 'ER_NO_REFERENCED_ROW':    // 1216 foreign key constraint fails
                case 'ER_NO_REFERENCED_ROW_2':  // 1452 foreign key constraint fails
                case 'ER_NO_DEFAULT_FOR_FIELD': // 1364 field doesn't have a default value
                    throw new ModelError(403, e.message); // Forbidden
                case 'ER_BAD_FIELD_ERROR':      // 1054 unknown column
                    throw new ModelError(500, e.message); // Internal Server Error for programming errors
                default:
                    console.error(`${model}.value`, e);
                    throw new ModelError(500, e.message); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Update Object details.
     *
     * @param  {string} model - Model / table name.
     * @param  {number} id - Object id.
     * @param  {Object} values - Object details.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on validation or referential integrity errors.
     */
    static async update(model, id, values, connection=undefined) {
        debug(`${model}.update`, id, Object.keys(values).join(', ').slice(0, 48)+(Object.keys(values).join(', ').length>48?'...':''));

        try {

            await Db.query(`Update ${model} Set ? Where ${model}Id = ?`, [ values, id ], connection); // TODO: use execute once available: https://github.com/sidorares/node-mysql2/issues/756

        } catch (e) {
            switch (e.code) { // just use default MySQL messages for now
                case 'ER_BAD_NULL_ERROR':      // 1048 column cannot be null
                case 'ER_DUP_ENTRY':           // 1062 duplicate entry
                case 'ER_NO_REFERENCED_ROW':   // 1216 foreign key constraint fails
                case 'ER_ROW_IS_REFERENCED':   // 1217 foreign key constraint fails
                case 'ER_ROW_IS_REFERENCED_2': // 1451 foreign key constraint fails
                case 'ER_NO_REFERENCED_ROW_2': // 1452 foreign key constraint fails
                    throw new ModelError(403, `‘${model}’ ${e.message}`); // Forbidden
                case 'ER_BAD_FIELD_ERROR':
                    throw new ModelError(500, `‘${model}’ ${e.message}`); // Internal Server Error for programming errors
                default:
                    console.error(`${model}.update`, e);
                    throw new ModelError(500, `‘${model}’ ${e.message}`); // Internal Server Error for uncaught exception
            }
        }
    }


    /**
     * Delete Object record.
     *
     * @param  {string} model - Model / table name.
     * @param  {number} id - Object id.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async delete(model, id, connection=undefined) {
        debug(`${model}.delete`, id);

        try {

            await Db.execute(`Delete From ${model} Where ${model}Id = :id`, { id }, connection);
            return true; // helps tests!

        } catch (e) {
            switch (e.code) {
                case 'ER_ROW_IS_REFERENCED':   // 1217 foreign key constraint fails
                case 'ER_ROW_IS_REFERENCED_2': // 1451 foreign key constraint fails
                    throw new ModelError(403, `${model} has dependent record(s)`); // Forbidden
                default:
                    console.error(`${model}.delete`, e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }


    /**
     * Delete Object record on specified condition - useful for deleting related (1:n) records.
     *
     * @param  {string} model - Model / table name.
     * @param  {string} field - Field condition is to be applied to.
     * @param  {number} id - Object id.
     * @param  {Object} [connection] - Connection to use (e.g. within transaction); otherwise from pool.
     * @throws Error on referential integrity errors.
     */
    static async deleteWhere(model, field, id, connection=undefined) {
        debug(`${model}.deleteWhere`, field, id);

        try {

            await Db.execute(`Delete From ${model} Where ${field} = :id`, { id }, connection);
            return true; // helps tests!

        } catch (e) {
            switch (e.code) {
                case 'ER_ROW_IS_REFERENCED':   // 1217 foreign key constraint fails
                case 'ER_ROW_IS_REFERENCED_2': // 1451 foreign key constraint fails
                    throw new ModelError(403, `${model} has dependent record(s)`); // Forbidden
                default:
                    console.error(`${model}.delete`, e);
                    throw new ModelError(500, e.message); // Internal Server Error
            }
        }
    }

}

// Note errors 1451:ER_ROW_IS_REFERENCED_2 & 1452:ER_NO_REFERENCED_ROW_2 replaced errors
// 1216:ER_NO_REFERENCED_ROW & 1217:ER_ROW_IS_REFERENCED in MySQL 5.0.14 (2005)

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default SuperModel;
