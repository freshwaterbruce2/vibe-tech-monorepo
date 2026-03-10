// @ts-nocheck
const sqlite3 = require('sqlite3').verbose();
const _path = require('path');

const DATABASE_PATH = process.env.DATABASE_PATH || 'D:\\databases\\database.db';

let dbInstance = null;

function connect() {
    if (dbInstance) return dbInstance;

    dbInstance = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
            console.error('Could not connect to database', err);
        } else {
             
            console.warn('Connected to database at', DATABASE_PATH);
        }
    });

    // Enable WAL mode for better concurrency
    dbInstance.run('PRAGMA journal_mode = WAL;');
    
    return dbInstance;
}

function getDb() {
    if (!dbInstance) {
        return connect();
    }
    return dbInstance;
}

// Promise wrappers
function run(sql, params = []) {
    const db = getDb();
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    const db = getDb();
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function all(sql, params = []) {
    const db = getDb();
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function close() {
    if (dbInstance) {
        return new Promise((resolve, reject) => {
            dbInstance.close((err) => {
                if (err) reject(err);
                else {
                    dbInstance = null;
                    resolve();
                }
            });
        });
    }
    return Promise.resolve();
}

module.exports = {
    connect,
    getDb,
    run,
    get,
    all,
    close
};
