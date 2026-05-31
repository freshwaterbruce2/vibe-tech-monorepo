import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let db: Database.Database;

try {
  const dbPath = env.DATABASE_URL;

  if (dbPath !== ':memory:') {
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      logger.info(`Creating database directory at: ${parentDir}`);
      fs.mkdirSync(parentDir, { recursive: true });
    }
    logger.info(`Initializing SQLite database at: ${dbPath}`);
  } else {
    logger.info('Initializing SQLite in-memory database for testing.');
  }

  // Open database connection
  db = new Database(dbPath, {
    verbose: (message) => logger.debug(`SQL: ${message}`)
  });

  // Enable WAL journal mode for performance and concurrent read/write support
  db.pragma('journal_mode = WAL');
  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON');

} catch (err) {
  logger.error('Failed to initialize SQLite database connection:', {}, err as Error);
  process.exit(1);
}

export { db };
