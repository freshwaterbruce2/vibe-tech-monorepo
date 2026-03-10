import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';
import { sqliteConfig } from '../config/sqlite';
import { logger } from '../utils/logger';
import * as schema from './schema/sqlite';

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;

export async function initializeSqliteDatabase(): Promise<void> {
	try {
		// Ensure the directory exists
		const dbDir = path.dirname(sqliteConfig.database.path);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
			logger.info(`Created database directory: ${dbDir}`);
		}

		// Create SQLite connection
		sqlite = new Database(sqliteConfig.database.path);

		// Configure SQLite for performance and reliability
		if (sqliteConfig.database.enableWAL) {
			sqlite.pragma('journal_mode = WAL');
		}
		sqlite.pragma('synchronous = NORMAL');
		sqlite.pragma('cache_size = -64000'); // 64MB cache
		sqlite.pragma('temp_store = MEMORY');
		sqlite.pragma('foreign_keys = ON');
		sqlite.pragma(`busy_timeout = ${sqliteConfig.database.busyTimeout}`);

		logger.info(`SQLite database connected at: ${sqliteConfig.database.path}`);

		// Initialize Drizzle ORM
		db = drizzle(sqlite, { schema, logger: true });

		logger.info('SQLite database initialization completed');
	} catch (error) {
		logger.error('SQLite database initialization failed:', error);
		throw error;
	}
}

export function getSqliteDb() {
	if (!db) {
		throw new Error(
			'SQLite database not initialized. Call initializeSqliteDatabase() first.',
		);
	}
	return db;
}

export function getSqliteConnection() {
	if (!sqlite) {
		throw new Error(
			'SQLite connection not initialized. Call initializeSqliteDatabase() first.',
		);
	}
	return sqlite;
}

export async function closeSqliteDatabase(): Promise<void> {
	if (sqlite) {
		sqlite.close();
		logger.info('SQLite database connection closed');
	}
}

// Export schema for use in other modules
export { schema };
