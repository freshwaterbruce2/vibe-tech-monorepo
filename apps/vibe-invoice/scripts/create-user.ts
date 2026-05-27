import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../server/src/auth.js';

// Enforce D:\ drive for database (same logic as server/src/db.ts)
const assertDatabasePathOnDDrive = (dbPath: string) => {
  const normalized = path.resolve(dbPath);
  if (!/^[dD]:\\/.test(normalized)) {
    throw new Error(`DATABASE_PATH must be on D:\\ (got: ${normalized})`);
  }
};

const getDatabasePath = () => {
  const dbPath = process.env.DATABASE_PATH || 'D:\\databases\\invoiceflow.db';
  assertDatabasePathOnDDrive(dbPath);
  return dbPath;
};

// Simple script to create a user account
// Usage: tsx scripts/create-user.ts accountant@example.com 'MyStrongPassword123!'

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: tsx scripts/create-user.ts <email> <password>');
    process.exit(1);
  }

  const dbPath = getDatabasePath();
  console.log(`Using database: ${dbPath}`);

  // Ensure directory exists
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  try {
    const { salt, hash } = await hashPassword(password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users
        (id, email, full_name, password_salt, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, email, 'Accountant', salt, hash, now, now);

    console.log(`✅ User created successfully: ${email}`);
    console.log(`   ID: ${id}`);
    console.log(`   You can now log in with this email and the password you provided.`);

  } catch (error) {
    console.error('Failed to create user:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
