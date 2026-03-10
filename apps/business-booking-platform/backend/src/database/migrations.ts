import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { logger } from '../utils/logger';
import { getDb } from './index';

export async function runMigrations() {
	try {
		const db = getDb();

		logger.info('Starting database migrations...');

		await migrate(db, {
			migrationsFolder: path.join(__dirname, 'migrations'),
		});

		logger.info('Database migrations completed successfully');
	} catch (error) {
		logger.error('Database migration failed', { error });
		throw error;
	}
}

export async function initializeDatabase() {
	try {
		// Run migrations
		await runMigrations();

		// Test connection
		const db = getDb();
		await db.execute('SELECT 1');

		logger.info('Database connection established successfully');
	} catch (error) {
		logger.error('Database initialization failed', { error });
		throw error;
	}
}
