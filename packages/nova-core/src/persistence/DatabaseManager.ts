import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as schemaMigrations from './schemaMigrations.js';

/**
 * DatabaseManager - Singleton manager for Nova's persistent storage
 * All databases are stored on D:\databases as per AGENTS.md requirements
 */
export interface DatabaseManagerOptions {
    /** Use in-memory database for testing */
    inMemory?: boolean;
    /** Custom database path (defaults to D:\databases\nova_memory.db) */
    dbPath?: string;
}

export class DatabaseManager {
    private static instance: DatabaseManager | null = null;
    private db: Database.Database | null = null;
    private readonly dbPath: string;
    private readonly dbDir: string;
    private readonly inMemory: boolean;

    private constructor(options: DatabaseManagerOptions = {}) {
        this.inMemory = options.inMemory ?? false;
        if (this.inMemory) {
            this.dbDir = '';
            this.dbPath = ':memory:';
        } else {
            this.dbDir = path.dirname(options.dbPath ?? 'D:\\databases\\nova_memory.db');
            this.dbPath = options.dbPath ?? path.join(this.dbDir, 'nova_memory.db');
        }
    }

    public static getInstance(options?: DatabaseManagerOptions): DatabaseManager {
        DatabaseManager.instance ??= new DatabaseManager(options);
        return DatabaseManager.instance;
    }

    /**
     * Initialize the database connection with WAL mode enabled
     */
    public initialize(): void {
        if (this.db) {
            console.log('DatabaseManager: Already initialized');
            return;
        }

        if (!this.inMemory && this.dbDir && !fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
            console.log(`DatabaseManager: Created directory ${this.dbDir}`);
        }

        this.db = new Database(this.dbPath);
        if (!this.inMemory) {
            this.db.pragma('journal_mode = WAL');
        }
        console.log(`DatabaseManager: Connected to ${this.dbPath}${this.inMemory ? ' (in-memory)' : ' with WAL mode'}`);

        schemaMigrations.runSchemaMigrations(this.db);
    }

    public getConnection(): Database.Database {
        if (!this.db) {
            throw new Error('DatabaseManager not initialized. Call initialize() first.');
        }
        return this.db;
    }

    public close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('DatabaseManager: Connection closed');
        }
    }

    /** Reset singleton for testing */
    public static resetInstance(): void {
        if (DatabaseManager.instance) {
            DatabaseManager.instance.close();
            DatabaseManager.instance = null;
        }
    }
}
