import Database from 'better-sqlite3';
import { getDatabasePath } from '@vibetech/shared-config';

const dbPath = getDatabasePath('app');
console.log('Database Path:', dbPath);
const db = new Database(dbPath);
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables, null, 2));
