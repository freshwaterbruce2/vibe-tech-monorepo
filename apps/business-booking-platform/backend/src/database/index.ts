import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as schema from './schema';
import * as sqliteSchema from './schema/sqlite';
import {
	closeSqliteDatabase,
	getSqliteDb,
	initializeSqliteDatabase,
} from './sqlite';

let pool: Pool;
let db: any; // Use any to handle both SQLite and PostgreSQL types

// Check if we should use SQLite
const useLocalSqlite = process.env.LOCAL_SQLITE === 'true';

export async function initializeDatabase(): Promise<void> {
	try {
		if (useLocalSqlite) {
			logger.info('Using SQLite database for local development');
			await initializeSqliteDatabase();
			db = getSqliteDb();
			return;
		}

		logger.info('Using PostgreSQL database');

		// Create connection pool
		pool = new Pool({
			host: config.database.host,
			port: config.database.port,
			database: config.database.name,
			user: config.database.user,
			password: config.database.password,
			ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
			max: config.database.poolSize,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		// Test connection
		await pool.query('SELECT NOW()');
		logger.info('PostgreSQL database connection established');

		// Initialize Drizzle ORM
		db = drizzle(pool, { schema });

		// Run migrations in production
		if (config.environment === 'production') {
			await migrate(db, { migrationsFolder: './migrations' });
			logger.info('Database migrations completed');
		}
	} catch (error) {
		logger.error('Database initialization failed:', error);
		throw error;
	}
}

export function getDb() {
	if (!db) {
		throw new Error(
			'Database not initialized. Call initializeDatabase() first.',
		);
	}
	return db;
}

export async function closeDatabase(): Promise<void> {
	try {
		if (useLocalSqlite) {
			await closeSqliteDatabase();
		} else if (pool) {
			await pool.end();
			logger.info('PostgreSQL database connection closed');
		}
	} catch (error) {
		logger.error('Error closing database connection:', error);
	}
}

// Export appropriate schema based on database type
export const dbSchema = useLocalSqlite ? sqliteSchema : schema;
export { schema, sqliteSchema };
