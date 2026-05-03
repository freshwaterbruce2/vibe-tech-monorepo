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

describe('POST /api/invoices: tax strategy + currency stamping', () => {
  let db: Database.Database
  let tmpDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-inv-fu-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)
    db.prepare(`UPDATE users SET default_currency = 'USD' WHERE id = ?`).run(
      'user-1',
    )

    app = Fastify()
    app.addHook('preHandler', async (req) => {
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

  const newInvoiceBody = (overrides: Record<string, unknown> = {}) => ({
    invoiceNumber: 'INV-FU-1',
    issueDate: '2026-05-01',
    dueDate: '2026-05-31',
    currency: 'USD',
    status: 'draft',
    client: { name: 'Acme', email: 'acme@example.com' },
    subtotal: 0,
    tax: 0,
    total: 0,
    items: [{ description: 'Service', quantity: 2, price: 100, total: 200 }],
    ...overrides,
  })

  describe('tax_strategy="invoice" (default, backwards compatible)', () => {
    it('uses body.tax as the absolute invoice-level tax', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({ subtotal: 200, tax: 25, total: 225 }),
      })
      expect(res.statusCode).toBe(200)
      const body = res.json() as {
        invoice: { taxStrategy: string; subtotal: number; tax: number; total: number }
      }
      expect(body.invoice.taxStrategy).toBe('invoice')
      expect(body.invoice.tax).toBe(25)
      expect(body.invoice.total).toBe(225)
    })
  })

  describe('tax_strategy="item"', () => {
    it('computes per-item tax from each item.taxRateId', async () => {
      db.prepare(
        `INSERT INTO tax_rates (id, user_id, name, rate_pct, created_at)
         VALUES ('tr-10', 'user-1', 'GST 10%', 10, ?)`,
      ).run(new Date().toISOString())
      db.prepare(
        `INSERT INTO tax_rates (id, user_id, name, rate_pct, created_at)
         VALUES ('tr-20', 'user-1', 'PST 20%', 20, ?)`,
      ).run(new Date().toISOString())

      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({
          taxStrategy: 'item',
          items: [
            { description: 'A', quantity: 1, price: 100, taxRateId: 'tr-10' },
            { description: 'B', quantity: 2, price: 50, taxRateId: 'tr-20' },
            { description: 'C (untaxed)', quantity: 1, price: 30 },
          ],
        }),
      })
      expect(res.statusCode).toBe(200)
      const body = res.json() as {
        invoice: {
          taxStrategy: string
          subtotal: number
          tax: number
          total: number
          items: Array<{ taxRateId?: string; total: number }>
        }
      }
      expect(body.invoice.taxStrategy).toBe('item')
      expect(body.invoice.subtotal).toBe(230)
      expect(body.invoice.tax).toBeCloseTo(10 + 20, 5)
      expect(body.invoice.total).toBeCloseTo(230 + 30, 5)
      expect(body.invoice.items[0].taxRateId).toBe('tr-10')
      expect(body.invoice.items[1].taxRateId).toBe('tr-20')
      expect(body.invoice.items[2].taxRateId).toBeUndefined()
    })

    it('ignores tax_rate_id when item-strategy not selected', async () => {
      db.prepare(
        `INSERT INTO tax_rates (id, user_id, name, rate_pct, created_at)
         VALUES ('tr-x', 'user-1', 'X 99%', 99, ?)`,
      ).run(new Date().toISOString())

      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({
          tax: 5,
          items: [{ description: 'A', quantity: 1, price: 100, taxRateId: 'tr-x' }],
        }),
      })
      const body = res.json() as { invoice: { tax: number; total: number } }
      expect(body.invoice.tax).toBe(5)
      expect(body.invoice.total).toBe(105)
    })

    it('rejects unknown tax_rate_id silently (treats as 0%)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({
          taxStrategy: 'item',
          items: [{ description: 'A', quantity: 1, price: 100, taxRateId: 'tr-ghost' }],
        }),
      })
      const body = res.json() as { invoice: { tax: number; total: number } }
      expect(body.invoice.tax).toBe(0)
      expect(body.invoice.total).toBe(100)
    })
  })

  describe('currency stamping', () => {
    it('stamps user_currency_at_issue + rate=1 when invoice currency matches user default', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({
          currency: 'USD',
          subtotal: 100,
          tax: 0,
          total: 100,
        }),
      })
      const body = res.json() as {
        invoice: {
          userCurrencyAtIssue?: string
          exchangeRateToUserCurrency?: number
        }
      }
      expect(body.invoice.userCurrencyAtIssue).toBe('USD')
      expect(body.invoice.exchangeRateToUserCurrency).toBe(1)
    })

    it('stamps cached FX rate when invoice currency differs from user default', async () => {
      db.prepare(
        `INSERT INTO exchange_rates (base, quote, rate_date, rate, fetched_at)
         VALUES ('EUR', 'USD', '2026-05-01', 1.085, ?)`,
      ).run(new Date().toISOString())

      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({
          currency: 'EUR',
          subtotal: 100,
          tax: 0,
          total: 100,
        }),
      })
      const body = res.json() as {
        invoice: {
          userCurrencyAtIssue?: string
          exchangeRateToUserCurrency?: number
        }
      }
      expect(body.invoice.userCurrencyAtIssue).toBe('USD')
      expect(body.invoice.exchangeRateToUserCurrency).toBe(1.085)
    })
  })

  describe('PUT updates also recompute + stamp', () => {
    it('PUT recomputes per-item tax + re-stamps currency', async () => {
      db.prepare(
        `INSERT INTO tax_rates (id, user_id, name, rate_pct, created_at)
         VALUES ('tr-15', 'user-1', 'VAT 15%', 15, ?)`,
      ).run(new Date().toISOString())

      const created = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: newInvoiceBody({ status: 'draft' }),
      })
      const id = (created.json() as { invoice: { id: string } }).invoice.id

      const res = await app.inject({
        method: 'PUT',
        url: `/api/invoices/${id}`,
        payload: newInvoiceBody({
          status: 'draft',
          taxStrategy: 'item',
          items: [{ description: 'X', quantity: 1, price: 200, taxRateId: 'tr-15' }],
        }),
      })
      expect(res.statusCode).toBe(200)
      const body = res.json() as {
        invoice: { taxStrategy: string; tax: number; total: number }
      }
      expect(body.invoice.taxStrategy).toBe('item')
      expect(body.invoice.tax).toBeCloseTo(30, 5)
      expect(body.invoice.total).toBeCloseTo(230, 5)
    })
  })
})
