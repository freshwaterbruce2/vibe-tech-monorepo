// @vitest-environment node
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { cloneInvoice, generateNextInvoiceNumber } from './generator.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedInvoice = (db: Database.Database, num: string, status = 'sent'): string => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES ('user-1', 'u@example.com', ?, ?, ?, ?)`,
  ).run(Buffer.from('s'), Buffer.from('h'), now, now)
  db.prepare(
    `INSERT OR IGNORE INTO clients (id, user_id, name, email, created_at, updated_at)
     VALUES ('c-1', 'user-1', 'Acme', 'a@b.com', ?, ?)`,
  ).run(now, now)
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO invoices
       (id, user_id, invoice_number, client_id, issue_date, due_date,
        subtotal, tax, total, status, currency, created_at, updated_at)
     VALUES (?, 'user-1', ?, 'c-1', '2026-05-01', '2026-05-31',
             100, 0, 100, ?, 'USD', ?, ?)`,
  ).run(id, num, status, now, now)
  db.prepare(
    `INSERT INTO invoice_items
       (id, invoice_id, description, quantity, price, total, created_at)
     VALUES (?, ?, 'Service', 1, 100, 100, ?)`,
  ).run(crypto.randomUUID(), id, now)
  return id
}

describe('recurring/generator', () => {
  let db: Database.Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-recur-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
  })

  afterEach(() => {
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('generateNextInvoiceNumber', () => {
    it('increments trailing digits with original padding', () => {
      seedInvoice(db, 'INV-001')
      expect(generateNextInvoiceNumber(db, 'user-1', 'INV-001')).toBe('INV-002')
    })

    it('skips taken candidates', () => {
      seedInvoice(db, 'INV-001')
      seedInvoice(db, 'INV-002')
      expect(generateNextInvoiceNumber(db, 'user-1', 'INV-001')).toBe('INV-003')
    })

    it('preserves wider padding', () => {
      seedInvoice(db, 'INV-0099')
      expect(generateNextInvoiceNumber(db, 'user-1', 'INV-0099')).toBe('INV-0100')
    })

    it('appends -R{N} when no digits in invoice number', () => {
      seedInvoice(db, 'INVOICE')
      expect(generateNextInvoiceNumber(db, 'user-1', 'INVOICE')).toBe(
        'INVOICE-R2',
      )
    })
  })

  describe('cloneInvoice', () => {
    it('clones invoice + items with parent_invoice_id set', () => {
      const parentId = seedInvoice(db, 'INV-100')
      const result = cloneInvoice(db, parentId)

      expect(result.newInvoiceNumber).toBe('INV-101')
      const cloned = db
        .prepare(
          'SELECT parent_invoice_id, status, invoice_number, total, currency FROM invoices WHERE id = ?',
        )
        .get(result.newInvoiceId) as {
        parent_invoice_id: string
        status: string
        invoice_number: string
        total: number
        currency: string
      }
      expect(cloned.parent_invoice_id).toBe(parentId)
      expect(cloned.status).toBe('sent')
      expect(cloned.total).toBe(100)
      expect(cloned.currency).toBe('USD')

      const items = db
        .prepare('SELECT description, quantity, price, total FROM invoice_items WHERE invoice_id = ?')
        .all(result.newInvoiceId) as { description: string; quantity: number; price: number; total: number }[]
      expect(items).toHaveLength(1)
      expect(items[0].description).toBe('Service')
    })

    it('preserves original due-date offset (issue_date + N days)', () => {
      const parentId = seedInvoice(db, 'INV-200')
      const result = cloneInvoice(db, parentId, {
        issueDate: new Date('2026-06-15'),
      })

      const cloned = db
        .prepare('SELECT issue_date, due_date FROM invoices WHERE id = ?')
        .get(result.newInvoiceId) as { issue_date: string; due_date: string }
      expect(cloned.issue_date).toBe('2026-06-15')
      const offsetDays = Math.round(
        (new Date(cloned.due_date).getTime() -
          new Date(cloned.issue_date).getTime()) /
          86_400_000,
      )
      expect(offsetDays).toBe(30)
    })

    it('throws when parent invoice does not exist', () => {
      expect(() => cloneInvoice(db, 'nonexistent')).toThrow(/parent .* not found/)
    })
  })
})
