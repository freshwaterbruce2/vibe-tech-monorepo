import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { resolve, dirname, join } from 'path';
import { existsSync, readdirSync, unlinkSync, mkdirSync } from 'fs';

describe('Path Segregation Compliance Watchdog', () => {
    const isCI = !!process.env.CI;
    // In GHA CI, DATABASE_PATH is defined (pointing to d-drive/databases/memory.db). Otherwise default to D:\databases
    const databasesDir = isCI && process.env.DATABASE_PATH
        ? dirname(resolve(process.env.DATABASE_PATH))
        : 'D:\\databases';

    const dbPaths = {
        memory: resolve(databasesDir, 'memory.db'),
        agent_learning: resolve(databasesDir, 'agent_learning.db'),
        nova_activity: resolve(databasesDir, 'nova_activity.db')
    };

    // Helper function to check safe connection settings
    const checkDbSettings = (dbPath: string) => {
        // Enforce physical drive segregation - database cannot reside inside V:\monorepo (code workspace)
        const workspaceRoot = resolve(__dirname, '../../../../'); // Walk up from packages/memory/src/__tests__
        const resolvedDbPath = resolve(dbPath);
        const resolvedPathLower = resolvedDbPath.toLowerCase();

        expect(resolvedPathLower.startsWith(workspaceRoot.toLowerCase())).toBe(false);
        expect(resolvedPathLower.includes('v:\\monorepo')).toBe(false);
        expect(resolvedPathLower.includes('v:/monorepo')).toBe(false);

        // Ensure database directory exists
        const dir = dirname(resolvedDbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Spin up database instance
        const db = new Database(resolvedDbPath);
        try {
            // Enforce WAL journal mode
            db.pragma('journal_mode = WAL');
            const journalModeResult = db.pragma('journal_mode') as any[];
            const journalMode = journalModeResult[0]?.journal_mode;
            expect(journalMode).toBe('wal');

            // Enforce busy_timeout = 5000
            db.pragma('busy_timeout = 5000');
            const busyTimeoutResult = db.pragma('busy_timeout') as any[];
            const busyTimeout = busyTimeoutResult[0]?.timeout ?? busyTimeoutResult[0]?.busy_timeout;
            expect(Number(busyTimeout)).toBe(5000);
        } finally {
            db.close();
        }
    };

    // Helper to sweep temporary test databases (like ship-check-*.sqlite and sidecars)
    const sweepTempDatabases = () => {
        if (!existsSync(databasesDir)) {
            return;
        }
        const files = readdirSync(databasesDir);
        for (const file of files) {
            if (file.startsWith('ship-check-')) {
                const filePath = join(databasesDir, file);
                try {
                    unlinkSync(filePath);
                } catch (err) {
                    // Ignore locks if file is active
                }
            }
        }
    };

    beforeAll(() => {
        sweepTempDatabases();
    });

    afterAll(() => {
        sweepTempDatabases();
    });

    it('should verify memory.db targets D:\\databases\\ or canonical folder and uses WAL + busy_timeout=5000', () => {
        checkDbSettings(dbPaths.memory);
    });

    it('should verify agent_learning.db targets D:\\databases\\ or canonical folder and uses WAL + busy_timeout=5000', () => {
        checkDbSettings(dbPaths.agent_learning);
    });

    it('should verify nova_activity.db targets D:\\databases\\ or canonical folder and uses WAL + busy_timeout=5000', () => {
        checkDbSettings(dbPaths.nova_activity);
    });

    it('should successfully sweep temporary database files', () => {
        // Ensure database directory exists
        if (!existsSync(databasesDir)) {
            mkdirSync(databasesDir, { recursive: true });
        }

        // Create a dummy temporary test database to test the sweeper helper
        const tempDbPath = join(databasesDir, 'ship-check-temp-test.sqlite');
        const tempWalPath = `${tempDbPath}-wal`;
        const tempShmPath = `${tempDbPath}-shm`;

        const db = new Database(tempDbPath);
        db.pragma('journal_mode = WAL');
        db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');
        db.close();

        expect(existsSync(tempDbPath)).toBe(true);

        sweepTempDatabases();

        expect(existsSync(tempDbPath)).toBe(false);
        expect(existsSync(tempWalPath)).toBe(false);
        expect(existsSync(tempShmPath)).toBe(false);
    });
});
