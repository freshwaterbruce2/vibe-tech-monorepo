import type Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

interface Migration {
  version: string
  filename: string
  sql: string
}

export interface MigrationResult {
  applied: string[]
  skipped: string[]
}

const MIGRATION_FILE_PATTERN = /^\d{4}_[a-z0-9_-]+\.sql$/i

const ensureMigrationTable = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)
}

const loadMigrations = (dir: string): Migration[] => {
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`)
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const f of files) {
    if (!MIGRATION_FILE_PATTERN.test(f)) {
      throw new Error(
        `Invalid migration filename "${f}". Expected NNNN_name.sql (e.g. 0002_payments.sql).`,
      )
    }
  }
  return files.map((filename) => ({
    version: path.basename(filename, '.sql'),
    filename,
    sql: fs.readFileSync(path.join(dir, filename), 'utf8'),
  }))
}

const getApplied = (db: Database.Database): Set<string> => {
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as {
    version: string
  }[]
  return new Set(rows.map((r) => r.version))
}

export const runMigrations = (
  db: Database.Database,
  dir: string,
): MigrationResult => {
  ensureMigrationTable(db)
  const all = loadMigrations(dir)
  const applied = getApplied(db)
  const result: MigrationResult = { applied: [], skipped: [] }
  const insert = db.prepare(
    'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)',
  )

  for (const m of all) {
    if (applied.has(m.version)) {
      result.skipped.push(m.version)
      continue
    }
    const tx = db.transaction(() => {
      db.exec(m.sql)
      insert.run(m.version, new Date().toISOString())
    })
    tx()
    result.applied.push(m.version)
  }
  return result
}
