/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Manage MySQL database connections.                                                             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import mysql from 'mysql2/promise'; // fast mysql driver
import Debug from 'debug';          // small debugging utility

const debug = Debug('app:mysql'); // mysql db queries

let connectionPool = null;


class MysqlDb {

    /**
     * Perform a query.
     *
     * @param   {string} sql - The SQL command to be executed.
     * @param   {Array}  values - Values to be substituted in SQL placeholders.
     * @returns Array containing array of result rows and array of fields.
     *
     * @example
     *   const [ books ] = await Db.query('Select * From Books Where Author = ?', [ 'David' ]);
     */
    static async query(sql, values) {
        if (!connectionPool) await setupConnectionPool();
        debug(sql, values);

        return connectionPool.query(sql, values);
    }

    /**
     * Get a connection to the database.
     *
     * This is useful for performing multiple queries within a transaction, or sharing data objects
     * such as temporary tables between subsequent queries. The connection must be released.
     *
     * @example
     *   const db = await Db.connect();
     *   await db.beginTransaction();
     *   try {
     *       await db.query('Insert Into Posts Set Title = ?', title);
     *       await db.query('Insert Into Log Set Data = ?', log);
     *       await db.commit();
     *   } catch (e) {
     *       await db.rollback();
     *       throw e;
     *   }
     *   db.release();
     *
     * @returns {Object} Database connection.
     */
    static async connect() {
        if (!connectionPool) await setupConnectionPool();

        const db = await global.connectionPool.getConnection();

        return db;
    }
}


/**
 * First connection request after app startup will set up connection pool.
 */
async function setupConnectionPool() {
    const dbConfigKeyVal = process.env.DB_CONNECTION.split(';').map(v => v.trim().split('='));
    const dbConfig = dbConfigKeyVal.reduce((config, v) => { config[v[0].toLowerCase()] = v[1]; return config; }, {});
    dbConfig.namedPlaceholders = true;
    connectionPool = mysql.createPool(dbConfig);
    // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
    await connectionPool.query('SET SESSION sql_mode = "TRADITIONAL"');
    debug(`connected to ${dbConfig.Host}/${dbConfig.Database}`);
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default MysqlDb;
