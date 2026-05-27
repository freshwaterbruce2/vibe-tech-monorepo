// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { upsertPolicy } from './policy.js'
import { runDunningSweep } from './sweep.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedUser = (db: Database.Database, userId = 'user-1'): void => {
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    `${userId}@example.com`,
    Buffer.from('s'),
    Buffer.from('h'),
    new Date().toISOString(),
    new Date().toISOString(),
  )
}

const seedInvoice = (
  db: Database.Database,
  invoiceId: string,
  dueDate: string,
  status: string,
  userId = 'user-1',
): void => {
  db.prepare(
    `INSERT OR IGNORE INTO clients (id, user_id, name, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    `c-${invoiceId}`,
    userId,
    'Acme',
    'a@b.com',
    new Date().toISOString(),
    new Date().toISOString(),
  )
  db.prepare(
    `INSERT INTO invoices
       (id, user_id, invoice_number, client_id, issue_date, due_date,
        subtotal, tax, total, status, currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, '2026-01-01', ?, 100, 0, 100, ?, 'USD', ?, ?)`,
  ).run(
    invoiceId,
    userId,
    `INV-${invoiceId}`,
    `c-${invoiceId}`,
    dueDate,
    status,
    new Date().toISOString(),
    new Date().toISOString(),
  )
}

describe('dunning/sweep', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-dun-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const now = new Date('2026-05-15T10:00:00Z')

  it('skips invoices that are not overdue', () => {
    seedInvoice(db, 'i-1', '2026-05-20', 'sent')
    const r = runDunningSweep(db, now)
    expect(r.invoicesScanned).toBe(0)
    expect(r.remindersEnqueued).toBe(0)
  })

  it('skips invoices that are paid', () => {
    seedInvoice(db, 'i-2', '2026-05-01', 'paid')
    const r = runDunningSweep(db, now)
    expect(r.remindersEnqueued).toBe(0)
  })

  it('enqueues step 1 (7 days) for an invoice 8 days overdue with default policy', () => {
    seedInvoice(db, 'i-3', '2026-05-07', 'sent')
    const r = runDunningSweep(db, now)
    expect(r.remindersEnqueued).toBe(1)
    const job = db
      .prepare("SELECT type, payload_json FROM jobs WHERE type = 'email.overdue'")
      .get() as { type: string; payload_json: string }
    const payload = JSON.parse(job.payload_json) as {
      invoiceId: string
      reminderStep: number
    }
    expect(payload.invoiceId).toBe('i-3')
    expect(payload.reminderStep).toBe(1)
  })

  it('does not re-send the same step on a subsequent sweep', () => {
    seedInvoice(db, 'i-4', '2026-05-07', 'sent')
    const r1 = runDunningSweep(db, now)
    expect(r1.remindersEnqueued).toBe(1)
    const r2 = runDunningSweep(db, now)
    expect(r2.remindersEnqueued).toBe(0)
    const historyCount = db
      .prepare("SELECT COUNT(*) as c FROM dunning_history WHERE invoice_id = 'i-4'")
      .get() as { c: number }
    expect(historyCount.c).toBe(1)
  })

  it('advances to step 2 (14 days) once enough time passes', () => {
    seedInvoice(db, 'i-5', '2026-04-25', 'sent')
    const earlier = new Date('2026-05-03T10:00:00Z')
    runDunningSweep(db, earlier)
    const later = new Date('2026-05-10T10:00:00Z')
    const r2 = runDunningSweep(db, later)
    expect(r2.remindersEnqueued).toBe(1)
    const sentSteps = db
      .prepare(
        "SELECT reminder_step FROM dunning_history WHERE invoice_id = 'i-5' ORDER BY reminder_step",
      )
      .all() as { reminder_step: number }[]
    expect(sentSteps.map((r) => r.reminder_step)).toEqual([1, 2])
  })

  it('respects per-user policy override', () => {
    seedInvoice(db, 'i-6', '2026-05-01', 'sent')
    upsertPolicy(db, 'user-1', {
      enabled: true,
      reminders: [{ daysAfterDue: 30 }],
    })
    const r = runDunningSweep(db, now)
    expect(r.remindersEnqueued).toBe(0)
  })

  it('skips when policy is disabled', () => {
    seedInvoice(db, 'i-7', '2026-05-01', 'sent')
    upsertPolicy(db, 'user-1', {
      enabled: false,
      reminders: [{ daysAfterDue: 1 }],
    })
    const r = runDunningSweep(db, now)
    expect(r.remindersEnqueued).toBe(0)
  })
})

describe('dunning/policy validation', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-pol-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rejects empty reminders array', () => {
    expect(() =>
      upsertPolicy(db, 'user-1', { enabled: true, reminders: [] }),
    ).toThrow(/between 1 and 5/)
  })

  it('rejects out-of-order reminders', () => {
    expect(() =>
      upsertPolicy(db, 'user-1', {
        enabled: true,
        reminders: [{ daysAfterDue: 14 }, { daysAfterDue: 7 }],
      }),
    ).toThrow(/ascending/)
  })

  it('rejects daysAfterDue out of range', () => {
    expect(() =>
      upsertPolicy(db, 'user-1', {
        enabled: true,
        reminders: [{ daysAfterDue: 0 }],
      }),
    ).toThrow(/between 1 and 365/)
    expect(() =>
      upsertPolicy(db, 'user-1', {
        enabled: true,
        reminders: [{ daysAfterDue: 999 }],
      }),
    ).toThrow(/between 1 and 365/)
  })

  it('persists and round-trips a valid policy', () => {
    const written = upsertPolicy(db, 'user-1', {
      enabled: false,
      reminders: [{ daysAfterDue: 3 }, { daysAfterDue: 10 }],
    })
    expect(written.enabled).toBe(false)
    expect(written.reminders).toEqual([
      { daysAfterDue: 3 },
      { daysAfterDue: 10 },
    ])
  })
})
