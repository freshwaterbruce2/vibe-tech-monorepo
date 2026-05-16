// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from './index.js'

describe('runMigrations', () => {
  let dbPath: string
  let migrationsDir: string
  let db: Database.Database

  beforeEach(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-mig-'))
    dbPath = path.join(tmp, 'test.db')
    migrationsDir = path.join(tmp, 'migrations')
    fs.mkdirSync(migrationsDir, { recursive: true })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  })

  afterEach(() => {
    db.close()
    const tmpRoot = path.dirname(migrationsDir)
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  const writeMigration = (filename: string, sql: string) => {
    fs.writeFileSync(path.join(migrationsDir, filename), sql, 'utf8')
  }

  it('applies all pending migrations in lexical order', () => {
    writeMigration('0001_users.sql', 'CREATE TABLE users(id TEXT PRIMARY KEY);')
    writeMigration(
      '0002_clients.sql',
      'CREATE TABLE clients(id TEXT PRIMARY KEY, user_id TEXT);',
    )

    const result = runMigrations(db, migrationsDir)

    expect(result.applied).toEqual(['0001_users', '0002_clients'])
    expect(result.skipped).toEqual([])
    const versions = db
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all() as { version: string }[]
    expect(versions.map((v) => v.version)).toEqual(['0001_users', '0002_clients'])
  })

  it('is a no-op when re-run with no new migrations', () => {
    writeMigration('0001_users.sql', 'CREATE TABLE users(id TEXT PRIMARY KEY);')
    runMigrations(db, migrationsDir)

    const second = runMigrations(db, migrationsDir)

    expect(second.applied).toEqual([])
    expect(second.skipped).toEqual(['0001_users'])
  })

  it('applies only new migrations on subsequent runs', () => {
    writeMigration('0001_users.sql', 'CREATE TABLE users(id TEXT PRIMARY KEY);')
    runMigrations(db, migrationsDir)

    writeMigration(
      '0002_clients.sql',
      'CREATE TABLE clients(id TEXT PRIMARY KEY);',
    )
    const second = runMigrations(db, migrationsDir)

    expect(second.applied).toEqual(['0002_clients'])
    expect(second.skipped).toEqual(['0001_users'])
  })

  it('rolls back the entire migration on SQL error and does not record version', () => {
    writeMigration(
      '0001_broken.sql',
      `CREATE TABLE good(id TEXT PRIMARY KEY);
       INSERT INTO good(id) VALUES('a');
       CREATE TABLE good(id TEXT PRIMARY KEY);`,
    )

    expect(() => runMigrations(db, migrationsDir)).toThrow()

    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='good'")
      .get()
    expect(tableExists).toBeUndefined()
    const versions = db.prepare('SELECT version FROM schema_migrations').all()
    expect(versions).toEqual([])
  })

  it('rejects invalid migration filenames', () => {
    writeMigration('not_a_migration.sql', 'SELECT 1;')
    expect(() => runMigrations(db, migrationsDir)).toThrow(
      /Invalid migration filename/,
    )
  })

  it('throws when migrations directory does not exist', () => {
    fs.rmSync(migrationsDir, { recursive: true, force: true })
    expect(() => runMigrations(db, migrationsDir)).toThrow(
      /Migrations directory not found/,
    )
  })

  it('handles empty directory by creating only schema_migrations table', () => {
    const result = runMigrations(db, migrationsDir)
    expect(result.applied).toEqual([])
    expect(result.skipped).toEqual([])
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
      )
      .get()
    expect(tableExists).toEqual({ name: 'schema_migrations' })
  })
})
