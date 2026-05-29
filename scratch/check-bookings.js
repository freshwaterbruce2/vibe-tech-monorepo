import Database from 'better-sqlite3';
import { getDatabasePath } from '@vibetech/shared-config';

const db = new Database(getDatabasePath('app'));
const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'").get();
console.log('Bookings schema:', table);
const paymentsTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get();
console.log('Payments schema:', paymentsTable);
