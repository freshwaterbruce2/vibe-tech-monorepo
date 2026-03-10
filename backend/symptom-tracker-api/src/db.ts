import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type Db = DatabaseSync

export function openDb(databasePath: string): Db {
  const dir = path.dirname(databasePath)
  fs.mkdirSync(dir, { recursive: true })

  const db = new DatabaseSync(databasePath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')

  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS symptom_entries (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      symptom TEXT NOT NULL,
      severity INTEGER NOT NULL,
      notes TEXT,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_symptom_entries_person_date
      ON symptom_entries (person_id, date DESC);
  `)

  return db
}
