// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { runMigrations } from '../migrations/index.js'
import { registerExpenseRoutes } from './expenseRoutes.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const seedUser = (db: Database.Database) => {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
     VALUES ('user-1', 'u@x.com', ?, ?, ?, ?)`,
  ).run(Buffer.from('s'), Buffer.from('h'), now, now)
}

describe('expense routes', () => {
  let db: Database.Database
  let tmpDir: string
  let receiptDir: string
  let app: FastifyInstance

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-exp-'))
    receiptDir = path.join(tmpDir, 'receipts')
    process.env.RECEIPT_DIR = receiptDir
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)
    seedUser(db)

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      ;(req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    await registerExpenseRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.RECEIPT_DIR
  })

  it('creates an expense without a receipt', async () => {
    const form = `--BOUNDARY\r\nContent-Disposition: form-data; name="description"\r\n\r\nLunch\r\n--BOUNDARY\r\nContent-Disposition: form-data; name="amount"\r\n\r\n42.50\r\n--BOUNDARY\r\nContent-Disposition: form-data; name="expenseDate"\r\n\r\n2026-05-03\r\n--BOUNDARY--\r\n`
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { 'content-type': 'multipart/form-data; boundary=BOUNDARY' },
      payload: form,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { expense: { description: string; amount: number; receiptPath: string | null } }
    expect(body.expense.description).toBe('Lunch')
    expect(body.expense.amount).toBe(42.5)
    expect(body.expense.receiptPath).toBeNull()
  })

  it('rejects missing amount', async () => {
    const form = `--BOUNDARY\r\nContent-Disposition: form-data; name="description"\r\n\r\nNoAmount\r\n--BOUNDARY\r\nContent-Disposition: form-data; name="expenseDate"\r\n\r\n2026-05-03\r\n--BOUNDARY--\r\n`
    const res = await app.inject({
      method: 'POST',
      url: '/api/expenses',
      headers: { 'content-type': 'multipart/form-data; boundary=BOUNDARY' },
      payload: form,
    })
    expect(res.statusCode).toBe(400)
  })

  it('lists expenses filtered by date range', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO expenses (id, user_id, amount, currency, expense_date, created_at, updated_at)
       VALUES ('e1','user-1',10,'USD','2026-05-01',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO expenses (id, user_id, amount, currency, expense_date, created_at, updated_at)
       VALUES ('e2','user-1',20,'USD','2026-06-01',?,?)`,
    ).run(now, now)

    const res = await app.inject({
      method: 'GET',
      url: '/api/expenses?from=2026-05-15&to=2026-06-30',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { expenses: { id: string }[] }
    expect(body.expenses.map((e) => e.id)).toEqual(['e2'])
  })

  it('PATCH updates description', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO expenses (id, user_id, amount, currency, expense_date, created_at, updated_at)
       VALUES ('e1','user-1',10,'USD','2026-05-01',?,?)`,
    ).run(now, now)

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/expenses/e1',
      payload: { description: 'Updated' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { expense: { description: string } }
    expect(body.expense.description).toBe('Updated')
  })

  it('DELETE returns 204 when not invoiced', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO expenses (id, user_id, amount, currency, expense_date, created_at, updated_at)
       VALUES ('e1','user-1',10,'USD','2026-05-01',?,?)`,
    ).run(now, now)
    const res = await app.inject({ method: 'DELETE', url: '/api/expenses/e1' })
    expect(res.statusCode).toBe(204)
  })

  it('DELETE returns 409 when expense is invoiced', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
       VALUES ('c1','user-1','C','c@x.com',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',
               10,0,10,'sent','USD',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO expenses
         (id, user_id, amount, currency, expense_date, is_billable, invoiced_on_invoice_id,
          created_at, updated_at)
       VALUES ('e1','user-1',10,'USD','2026-05-01',1,'inv-1',?,?)`,
    ).run(now, now)
    const res = await app.inject({ method: 'DELETE', url: '/api/expenses/e1' })
    expect(res.statusCode).toBe(409)
  })

  it('from-expense creates invoice item and stamps invoiced_on_invoice_id', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
       VALUES ('c1','user-1','C','c@x.com',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',
               0,0,0,'draft','USD',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO expenses
         (id, user_id, amount, currency, expense_date, is_billable, description,
          created_at, updated_at)
       VALUES ('e1','user-1',45.99,'USD','2026-05-01',1,'Hotel',?,?)`,
    ).run(now, now)

    const res = await app.inject({
      method: 'POST',
      url: '/api/invoices/inv-1/items/from-expense',
      payload: { expenseId: 'e1' },
    })
    expect(res.statusCode).toBe(201)

    const item = db
      .prepare(`SELECT description, total FROM invoice_items WHERE invoice_id='inv-1'`)
      .get() as { description: string; total: number }
    expect(item.description).toBe('Hotel')
    expect(item.total).toBe(45.99)

    const exp = db
      .prepare(`SELECT invoiced_on_invoice_id FROM expenses WHERE id='e1'`)
      .get() as { invoiced_on_invoice_id: string }
    expect(exp.invoiced_on_invoice_id).toBe('inv-1')
  })

  it('from-expense rejects non-billable expense', async () => {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
       VALUES ('c1','user-1','C','c@x.com',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES ('inv-1','user-1','INV-1','c1','2026-05-01','2026-05-31',
               0,0,0,'draft','USD',?,?)`,
    ).run(now, now)
    db.prepare(
      `INSERT INTO expenses
         (id, user_id, amount, currency, expense_date, is_billable, created_at, updated_at)
       VALUES ('e1','user-1',45,'USD','2026-05-01',0,?,?)`,
    ).run(now, now)

    const res = await app.inject({
      method: 'POST',
      url: '/api/invoices/inv-1/items/from-expense',
      payload: { expenseId: 'e1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('expense category create + duplicate returns 409', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/expense-categories',
      payload: { name: 'Travel' },
    })
    expect(r1.statusCode).toBe(201)
    const r2 = await app.inject({
      method: 'POST',
      url: '/api/expense-categories',
      payload: { name: 'Travel' },
    })
    expect(r2.statusCode).toBe(409)
  })
})
