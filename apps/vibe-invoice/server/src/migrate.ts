import type Database from 'better-sqlite3'
import path from 'node:path'

import { runMigrations, type MigrationResult } from './migrations/index.js'

export const getMigrationsDir = (): string =>
  path.resolve(process.cwd(), 'server', 'src', 'migrations')

export const migrate = (db: Database.Database): MigrationResult =>
  runMigrations(db, getMigrationsDir())
