/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Set up database connections for unit tests.                                                    */
/*                                                                                                */
/* Note these tests do not mock out database components, but operate on the live db.              */
/*                                                                                                */
/* Because of the way 'before' works, this is best defined once & require'd within each separate  */
/* test, rather than being defined within each one. It only gets invoked once on calling          */
/* 'mocha test/unit/*.js'!                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import mysql from 'mysql2/promise'; // fast mysql driver


before(async function() {
    // MySQL connection
    const dbConfigKeyVal = process.env.DB_CONNECTION.split(';').map(v => v.trim().split('='));
    const dbConfig = dbConfigKeyVal.reduce((config, v) => { config[v[0].toLowerCase()] = v[1]; return config; }, {});
    const connectionPool = mysql.createPool(dbConfig);
    global.db = await connectionPool.getConnection();
    global.db.connection.config.namedPlaceholders = true;
    // traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc
    await global.db.query('SET SESSION sql_mode = "TRADITIONAL"');
});

export default before;
