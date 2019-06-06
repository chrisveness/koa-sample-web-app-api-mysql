/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Manage MySQL database connections.                                                             */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import mysql from 'mysql2/promise.js'; // fast mysql driver
import Debug from 'debug';             // small debugging utility

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
        debug('MysqlDb.query', sql.trim().split('\n')[0]+(sql.trim().split('\n').length>1?'...':''));

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
        debug('MysqlDb.connect');

        const db = await global.connectionPool.getConnection();

        return db;
    }


    /**
     * Return connection parameters used to connect to MySQL (obtained from the
     * DB_MYSQL_CONNECTION environment variable which should be a connection string in the format
     * "host=my.host.com; user=my-un; password=my-pw; database=my-db").
     *
     * @returns Object with host, user, password, database properties.
     */
    static connectionParams() {
        const connectionString = process.env.DB_MYSQL_CONNECTION;
        if (!connectionString) throw new Error('No DB_MYSQL_CONNECTION available');

        const dbConfigKeyVal = connectionString.split(';').map(v => v.trim().split('='));
        const dbConfig = dbConfigKeyVal.reduce((config, v) => { config[v[0].toLowerCase()] = v[1]; return config; }, {});

        return dbConfig;
    }
}


/**
 * First connection request after app startup will set up connection pool.
 */
async function setupConnectionPool() {
    const dbConfig = MysqlDb.connectionParams();
    dbConfig.namedPlaceholders = true;
    connectionPool = mysql.createPool(dbConfig);
    debug('MysqlDb.setupConnectionPool', `connect to ${dbConfig.host}/${dbConfig.database}`);

    // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
    await connectionPool.query('SET SESSION sql_mode = "TRADITIONAL"');
}

// Note errors 1451:ER_ROW_IS_REFERENCED_2 & 1452:ER_NO_REFERENCED_ROW_2 replaced errors
// 1216:ER_NO_REFERENCED_ROW & 1217:ER_ROW_IS_REFERENCED; in MySQL 5.0.14 (2005)


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default MysqlDb;
