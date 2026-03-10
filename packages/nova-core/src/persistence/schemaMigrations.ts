import type Database from 'better-sqlite3';

export interface SchemaMigration {
    id: number;
    name: string;
    sql: string;
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [
    {
        id: 1,
        name: 'create_project_files_table',
        sql: `
            CREATE TABLE IF NOT EXISTS project_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                file_hash TEXT,
                last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
                language TEXT,
                size_bytes INTEGER
            )
        `,
    },
    {
        id: 2,
        name: 'create_interaction_logs_table',
        sql: `
            CREATE TABLE IF NOT EXISTS interaction_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                payload TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
    },
    {
        id: 3,
        name: 'create_learning_events_table',
        sql: `
            CREATE TABLE IF NOT EXISTS learning_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                data TEXT,
                source TEXT,
                outcome TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
    },
    {
        id: 4,
        name: 'create_tasks_table',
        sql: `
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                context TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
    },
] as const;

function ensureMigrationsTable(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export function runSchemaMigrations(db: Database.Database): void {
    ensureMigrationsTable(db);

    const appliedMigrationRows = db
        .prepare('SELECT id FROM schema_migrations')
        .all() as { id: number }[];

    const appliedMigrationIds = new Set(appliedMigrationRows.map((row) => row.id));

    const applyMigration = db.transaction((migration: SchemaMigration) => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(migration.id, migration.name);
    });

    let appliedCount = 0;
    for (const migration of SCHEMA_MIGRATIONS) {
        if (!appliedMigrationIds.has(migration.id)) {
            applyMigration(migration);
            appliedCount += 1;
        }
    }

    if (appliedCount === 0) {
        console.log('DatabaseManager: Schema already up to date');
        return;
    }

    console.log(`DatabaseManager: Applied ${appliedCount} schema migration${appliedCount === 1 ? '' : 's'}`);
}
