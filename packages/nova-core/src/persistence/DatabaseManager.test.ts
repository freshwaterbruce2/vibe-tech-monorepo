import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseManager } from './DatabaseManager.js';
import * as schemaMigrations from './schemaMigrations.js';

describe('DatabaseManager', () => {
    beforeEach(() => {
        // Reset singleton between tests
        DatabaseManager.resetInstance();
    });

    afterEach(() => {
        DatabaseManager.resetInstance();
        vi.restoreAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = DatabaseManager.getInstance({ inMemory: true });
            const instance2 = DatabaseManager.getInstance({ inMemory: true });
            expect(instance1).toBe(instance2);
        });

        it('should create in-memory database when inMemory option is true', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();
            expect(conn).toBeDefined();
            expect(conn.open).toBe(true);
        });
    });

    describe('initialize', () => {
        it('should create all required tables', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();

            // Verify tables exist
            const tables = conn
                .prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `)
                .all() as { name: string }[];

            const tableNames = tables.map((t) => t.name);
            expect(tableNames).toContain('schema_migrations');
            expect(tableNames).toContain('project_files');
            expect(tableNames).toContain('interaction_logs');
            expect(tableNames).toContain('learning_events');
            expect(tableNames).toContain('tasks');
        });

        it('should be idempotent (can call multiple times)', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            dm.initialize(); // Should not throw
            expect(dm.getConnection().open).toBe(true);
        });

        it('should run schema migrations on first initialize', () => {
            const migrationSpy = vi.spyOn(schemaMigrations, 'runSchemaMigrations');
            const dm = DatabaseManager.getInstance({ inMemory: true });

            dm.initialize();

            expect(migrationSpy).toHaveBeenCalledTimes(1);
            expect(migrationSpy).toHaveBeenCalledWith(dm.getConnection());
        });

        it('should not rerun schema migrations when initialize is called again', () => {
            const migrationSpy = vi.spyOn(schemaMigrations, 'runSchemaMigrations');
            const dm = DatabaseManager.getInstance({ inMemory: true });

            dm.initialize();
            dm.initialize();

            expect(migrationSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getConnection', () => {
        it('should throw if not initialized', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            expect(() => dm.getConnection()).toThrow('DatabaseManager not initialized');
        });

        it('should return working connection after initialize', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();

            // Test we can execute queries
            const result = conn.prepare('SELECT 1 as value').get() as { value: number };
            expect(result.value).toBe(1);
        });
    });

    describe('close', () => {
        it('should close the connection', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();
            expect(conn.open).toBe(true);

            dm.close();
            expect(conn.open).toBe(false);
        });

        it('should be safe to call multiple times', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            dm.close();
            dm.close(); // Should not throw
        });
    });

    describe('table schemas', () => {
        it('project_files should have correct columns', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();

            const columns = conn.prepare(`PRAGMA table_info(project_files)`).all() as { name: string }[];
            const columnNames = columns.map((c) => c.name);

            expect(columnNames).toContain('id');
            expect(columnNames).toContain('file_path');
            expect(columnNames).toContain('file_hash');
            expect(columnNames).toContain('last_indexed');
            expect(columnNames).toContain('language');
            expect(columnNames).toContain('size_bytes');
        });

        it('tasks should have correct columns', () => {
            const dm = DatabaseManager.getInstance({ inMemory: true });
            dm.initialize();
            const conn = dm.getConnection();

            const columns = conn.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[];
            const columnNames = columns.map((c) => c.name);

            expect(columnNames).toContain('id');
            expect(columnNames).toContain('title');
            expect(columnNames).toContain('status');
            expect(columnNames).toContain('context');
        });
    });

    describe('resetInstance', () => {
        it('should allow creating new instance after reset', () => {
            const dm1 = DatabaseManager.getInstance({ inMemory: true });
            dm1.initialize();

            DatabaseManager.resetInstance();

            const dm2 = DatabaseManager.getInstance({ inMemory: true });
            expect(dm1).not.toBe(dm2);
        });
    });
});
