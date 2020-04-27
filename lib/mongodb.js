/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Manage MongoDB database connections.                                                           */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import mongodb from 'mongodb'; const MongoClient = mongodb.MongoClient; // MongoDB driver for Node.js TODO: named export not yet available
import Debug           from 'debug';   // small debugging utility

const debug = Debug('app:mongodb'); // db write ops

let db = null;


class MongoDb {

    /**
     * Return the specified collection.
     *
     * @param   {string} collectionName - Name of the collection.
     * @returns {Object} The MongoDB collection.
     *
     * @example
     *   const booksColln = await Db.collection('books');
     *   const books = await booksColln.find({ author: 'David' }).toArray();
     */
    static async collection(collectionName) {
        if (!db) await setupConnection();

        const collection = db.collection(collectionName);
        if (!collection) throw new Error(`Collection ${collectionName} not found`);

        return collection;
    }


    /**
     * Return all collections.
     *
     * @returns {Object[]} Collections in database.
     */
    static async collections() {
        if (!db) await setupConnection();

        return db.collections();
    }


    /**
     * Create a collection.
     *
     * @param {string} collectionName - Name of collection to be created.
     */
    static async createCollection(collectionName) {
        if (!db) await setupConnection();
        debug('MongoDb.createCollection', collectionName);

        await db.createCollection(collectionName);
    }


    /**
     * Execute database command.
     *
     * @param {Object} command - Command hash
     */
    static async command(command) {
        if (!db) await setupConnection();
        debug('MongoDb.command', command);

        await db.command(command);
    }
}


async function setupConnection() {
    const connectionString = process.env.DB_MONGO_CONNECTION;
    if (!connectionString) throw new Error('No MongoDB configuration available');
    const client = new MongoClient(connectionString, { useUnifiedTopology: true });
    try {
        await client.connect();
        db = client.db(client.s.options.dbName);
    } catch (err) {
        console.error(err.stack);
    }
    debug('MongoDb.setupConnection', client.s.options.dbName);
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default MongoDb;
