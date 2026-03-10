import { ElectronService } from './ElectronService';
import { logger } from './Logger';

/**
 * Execute a SQL migration file against the provided SQLite database instance.
 * The migration is run inside a transaction to guarantee atomicity.
 */
export async function runMigration(db: any, migrationFile: string): Promise<void> {
    const electronService = new ElectronService();
    // Guard: Native API required
    if (!electronService.isElectron() && !electronService.isTauri()) {
        throw new Error('Native file system API not available');
    }

    // Use Native API for file system access
    const content = await electronService.readFile(`migrations/${migrationFile}`);

    const sql = content;
    try {
        await db.run('BEGIN TRANSACTION');
        db.exec(sql);
        await db.run('COMMIT');
        logger.info(`[DatabaseService] Migration ${migrationFile} applied successfully`);
    } catch (err) {
        await db.run('ROLLBACK');
        logger.error(`[DatabaseService] Migration ${migrationFile} failed:`, err);
        throw err;
    }
}
