import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runSchemaMigrations, SCHEMA_MIGRATIONS } from './schemaMigrations.js';

describe('schemaMigrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates the migration tracking table and all schema tables', () => {
    runSchemaMigrations(db);

    const tables = db
      .prepare(
        `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
                `,
      )
      .all() as { name: string }[];

    const tableNames = tables.map((table) => table.name);
    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('project_files');
    expect(tableNames).toContain('interaction_logs');
    expect(tableNames).toContain('learning_events');
    expect(tableNames).toContain('tasks');
  });

  it('records each migration once and does not duplicate on rerun', () => {
    runSchemaMigrations(db);
    runSchemaMigrations(db);

    const applied = db.prepare('SELECT id, name FROM schema_migrations ORDER BY id').all() as {
      id: number;
      name: string;
    }[];

    expect(applied).toHaveLength(SCHEMA_MIGRATIONS.length);
    expect(applied.map((row) => row.id)).toEqual(
      SCHEMA_MIGRATIONS.map((migration) => migration.id),
    );
    expect(applied.map((row) => row.name)).toEqual(
      SCHEMA_MIGRATIONS.map((migration) => migration.name),
    );
  });

  it('applies only pending migrations when some migrations are already tracked', () => {
    const firstMigration = SCHEMA_MIGRATIONS[0];
    if (!firstMigration) throw new Error('No migrations found');

    db.exec(firstMigration.sql);
    db.exec(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    db.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(
      firstMigration.id,
      firstMigration.name,
    );

    runSchemaMigrations(db);

    const appliedIds = db.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as {
      id: number;
    }[];

    expect(appliedIds.map((row) => row.id)).toEqual(
      SCHEMA_MIGRATIONS.map((migration) => migration.id),
    );

    const tasksTable = db
      .prepare(
        `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'tasks'
            `,
      )
      .get() as { name: string } | undefined;

    expect(tasksTable?.name).toBe('tasks');
  });
});
