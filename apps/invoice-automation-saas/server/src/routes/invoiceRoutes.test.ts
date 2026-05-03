// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { registerInvoiceRoutes } from './invoiceRoutes.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedUser = (db: Database.Database, userId = 'user-1'): void => {
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    `${userId}@example.com`,
    Buffer.from('salt'),
    Buffer.from('hash'),
    new Date().toISOString(),
    new Date().toISOString(),
  )
}

const seedInvoice = (
  db: Database.Database,
  invoiceId: string,
  status: string,
  userId = 'user-1',
): void => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(`client-${invoiceId}`, userId, 'Acme', 'acme@example.com', now, now)
  db.prepare(
    `INSERT INTO invoices
       (id, user_id, invoice_number, client_id, issue_date, due_date,
        subtotal, tax, total, status, currency, public_token,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?)`,
  ).run(
    invoiceId,
    userId,
    `INV-${invoiceId}`,
    `client-${invoiceId}`,
    '2026-05-01',
    '2026-05-31',
    100,
    0,
    100,
    status,
    `tok-${invoiceId}`,
    now,
    now,
  )
  db.prepare(
    `INSERT INTO invoice_items
       (id, invoice_id, description, quantity, price, total, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(`item-${invoiceId}`, invoiceId, 'Consulting', 1, 100, 100, now)
}

const validBody = {
  invoiceNumber: 'INV-EDITED',
  issueDate: '2026-06-01',
  dueDate: '2026-06-30',
  currency: 'USD',
  status: 'draft',
  client: { name: 'Acme', email: 'acme@example.com' },
  subtotal: 200,
  tax: 0,
  total: 200,
  items: [{ description: 'Updated', quantity: 2, price: 100, total: 200 }],
}

describe('PUT/DELETE /api/invoices/:id', () => {
  let db: Database.Database
  let tmpDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-inv-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      // Test-only auth: pretend the user is always 'user-1'.
      ;(req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    registerInvoiceRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('PUT', () => {
    it('updates a draft invoice and returns 200', async () => {
      seedInvoice(db, 'inv-1', 'draft')

      const res = await app.inject({
        method: 'PUT',
        url: '/api/invoices/inv-1',
        payload: validBody,
      })

      expect(res.statusCode).toBe(200)
      const body = res.json() as { invoice: { invoiceNumber: string; total: number } }
      expect(body.invoice.invoiceNumber).toBe('INV-EDITED')
      expect(body.invoice.total).toBe(200)

      const row = db
        .prepare('SELECT invoice_number, total FROM invoices WHERE id = ?')
        .get('inv-1') as { invoice_number: string; total: number }
      expect(row.invoice_number).toBe('INV-EDITED')
      expect(row.total).toBe(200)
    })

    it('returns 409 when invoice status is not draft', async () => {
      seedInvoice(db, 'inv-2', 'sent')

      const res = await app.inject({
        method: 'PUT',
        url: '/api/invoices/inv-2',
        payload: validBody,
      })

      expect(res.statusCode).toBe(409)
      const body = res.json() as { error: string; status: string }
      expect(body.status).toBe('sent')
    })

    it('returns 404 when invoice does not exist', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/invoices/nonexistent',
        payload: validBody,
      })
      expect(res.statusCode).toBe(404)
    })

    it('replaces line items atomically', async () => {
      seedInvoice(db, 'inv-3', 'draft')

      await app.inject({
        method: 'PUT',
        url: '/api/invoices/inv-3',
        payload: {
          ...validBody,
          items: [
            { description: 'A', quantity: 1, price: 50, total: 50 },
            { description: 'B', quantity: 1, price: 150, total: 150 },
          ],
        },
      })

      const items = db
        .prepare('SELECT description FROM invoice_items WHERE invoice_id = ? ORDER BY description')
        .all('inv-3') as { description: string }[]
      expect(items.map((i) => i.description)).toEqual(['A', 'B'])
    })
  })

  describe('DELETE', () => {
    it('deletes a draft invoice and returns 204', async () => {
      seedInvoice(db, 'inv-4', 'draft')

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/invoices/inv-4',
      })

      expect(res.statusCode).toBe(204)
      const row = db
        .prepare('SELECT id FROM invoices WHERE id = ?')
        .get('inv-4')
      expect(row).toBeUndefined()
      const items = db
        .prepare('SELECT id FROM invoice_items WHERE invoice_id = ?')
        .all('inv-4')
      expect(items).toEqual([])
    })

    it('returns 409 when invoice status is not draft', async () => {
      seedInvoice(db, 'inv-5', 'paid')

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/invoices/inv-5',
      })

      expect(res.statusCode).toBe(409)
      const row = db
        .prepare('SELECT id FROM invoices WHERE id = ?')
        .get('inv-5') as { id: string }
      expect(row.id).toBe('inv-5')
    })

    it('returns 404 when invoice does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/invoices/nonexistent',
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
