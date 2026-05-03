import multipart from '@fastify/multipart'
import type Database from 'better-sqlite3'
import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'

import { recordAudit } from '../audit.js'
import type { AuthenticatedRequest, IdParams } from './types.js'

const nowIso = () => new Date().toISOString()
const DEFAULT_RECEIPT_DIR = 'D:\\data\\invoiceflow\\receipts'
const ALLOWED_RECEIPT_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
])
const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

interface ExpenseRow {
  id: string
  user_id: string
  client_id: string | null
  project_id: string | null
  category_id: string | null
  vendor: string | null
  description: string | null
  amount: number
  currency: string
  expense_date: string
  is_billable: number
  invoiced_on_invoice_id: string | null
  receipt_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface CategoryRow {
  id: string
  user_id: string
  name: string
  is_billable: number
  created_at: string
}

const toApi = (row: ExpenseRow) => ({
  id: row.id,
  clientId: row.client_id,
  projectId: row.project_id,
  categoryId: row.category_id,
  vendor: row.vendor,
  description: row.description,
  amount: row.amount,
  currency: row.currency,
  expenseDate: row.expense_date,
  isBillable: row.is_billable === 1,
  invoicedOnInvoiceId: row.invoiced_on_invoice_id,
  receiptPath: row.receipt_path,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const getReceiptDir = (): string => process.env.RECEIPT_DIR ?? DEFAULT_RECEIPT_DIR

const parseField = (raw: unknown, fallback = ''): string =>
  raw === undefined || raw === null ? fallback : String(raw).trim()

const parseAmount = (raw: unknown): number | null => {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export const registerExpenseRoutes = async (
  app: FastifyInstance,
  db: Database.Database,
): Promise<void> => {
  // Categories CRUD lives on the same prefix; no multipart needed for these routes.
  app.get('/api/expense-categories', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const rows = db
      .prepare(
        `SELECT * FROM expense_categories WHERE user_id = ? ORDER BY name ASC`,
      )
      .all(userId) as CategoryRow[]
    return {
      categories: rows.map((r) => ({
        id: r.id,
        name: r.name,
        isBillable: r.is_billable === 1,
        createdAt: r.created_at,
      })),
    }
  })

  app.post('/api/expense-categories', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const body = (req.body ?? {}) as { name?: unknown; isBillable?: unknown }
    const name = parseField(body.name)
    if (!name) return reply.code(400).send({ error: 'name is required' })
    const isBillable = body.isBillable === false ? 0 : 1
    const id = crypto.randomUUID()
    try {
      db.prepare(
        `INSERT INTO expense_categories (id, user_id, name, is_billable, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, userId, name, isBillable, nowIso())
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
        return reply.code(409).send({ error: 'Category already exists' })
      throw err
    }
    return reply.code(201).send({
      category: { id, name, isBillable: isBillable === 1, createdAt: nowIso() },
    })
  })

  app.get('/api/expenses', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const q = req.query as {
      from?: string
      to?: string
      clientId?: string
      categoryId?: string
      unbilled?: string
    }

    const where: string[] = ['user_id = ?']
    const params: unknown[] = [userId]
    if (q.from) {
      where.push('expense_date >= ?')
      params.push(q.from)
    }
    if (q.to) {
      where.push('expense_date <= ?')
      params.push(q.to)
    }
    if (q.clientId) {
      where.push('client_id = ?')
      params.push(q.clientId)
    }
    if (q.categoryId) {
      where.push('category_id = ?')
      params.push(q.categoryId)
    }
    if (q.unbilled === '1' || q.unbilled === 'true') {
      where.push('is_billable = 1 AND invoiced_on_invoice_id IS NULL')
    }

    const rows = db
      .prepare(
        `SELECT * FROM expenses WHERE ${where.join(' AND ')} ORDER BY expense_date DESC, created_at DESC`,
      )
      .all(...params) as ExpenseRow[]
    return { expenses: rows.map(toApi) }
  })

  app.patch('/api/expenses/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id FROM expenses WHERE id = ?')
      .get(id) as { user_id: string } | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })

    const body = (req.body ?? {}) as Record<string, unknown>
    const fields: Record<string, string> = {
      description: 'description',
      vendor: 'vendor',
      currency: 'currency',
      expenseDate: 'expense_date',
      categoryId: 'category_id',
      clientId: 'client_id',
      projectId: 'project_id',
      notes: 'notes',
    }
    const updates: string[] = []
    const params: unknown[] = []
    for (const [bodyKey, dbCol] of Object.entries(fields)) {
      if (body[bodyKey] !== undefined) {
        updates.push(`${dbCol} = ?`)
        params.push(body[bodyKey] === null ? null : String(body[bodyKey]))
      }
    }
    if (body.amount !== undefined) {
      const a = parseAmount(body.amount)
      if (a === null) return reply.code(400).send({ error: 'amount must be >= 0' })
      updates.push('amount = ?')
      params.push(a)
    }
    if (body.isBillable !== undefined) {
      updates.push('is_billable = ?')
      params.push(body.isBillable === true ? 1 : 0)
    }
    if (updates.length === 0)
      return reply.code(400).send({ error: 'no updatable fields provided' })
    updates.push('updated_at = ?')
    params.push(nowIso())
    params.push(id)
    db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    recordAudit(db, {
      actorUserId: userId,
      action: 'expense.updated',
      entityType: 'expense',
      entityId: id,
    })

    const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow
    return { expense: toApi(row) }
  })

  app.delete('/api/expenses/:id', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (req.params as IdParams).id
    const existing = db
      .prepare('SELECT user_id, receipt_path, invoiced_on_invoice_id FROM expenses WHERE id = ?')
      .get(id) as
      | { user_id: string; receipt_path: string | null; invoiced_on_invoice_id: string | null }
      | undefined
    if (!existing) return reply.code(404).send({ error: 'Not found' })
    if (existing.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })
    if (existing.invoiced_on_invoice_id)
      return reply.code(409).send({
        error: 'Expense is invoiced; remove the invoice line item first',
      })

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    if (existing.receipt_path && fs.existsSync(existing.receipt_path)) {
      try {
        fs.unlinkSync(existing.receipt_path)
      } catch {
        // tolerate file already gone
      }
    }
    recordAudit(db, {
      actorUserId: userId,
      action: 'expense.deleted',
      entityType: 'expense',
      entityId: id,
    })
    return reply.code(204).send()
  })

  // Multipart-scoped sub-app for create-with-receipt.
  await app.register(async (instance) => {
    await instance.register(multipart, {
      attachFieldsToBody: 'keyValues',
      limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 },
    })

    instance.post('/api/expenses', async (req, reply) => {
      const userId = (req as AuthenticatedRequest).authUserId
      if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

      const body = (req.body ?? {}) as Record<string, unknown>

      const description = parseField(body.description)
      const vendor = parseField(body.vendor) || null
      const amount = parseAmount(body.amount)
      if (amount === null) return reply.code(400).send({ error: 'amount must be >= 0' })
      const currency = parseField(body.currency, 'USD').toUpperCase() || 'USD'
      const expenseDate = parseField(body.expenseDate)
      if (!expenseDate)
        return reply.code(400).send({ error: 'expenseDate is required (YYYY-MM-DD)' })
      const isBillable = String(body.isBillable ?? 'false') === 'true' ? 1 : 0
      const categoryId = parseField(body.categoryId) || null
      const clientId = parseField(body.clientId) || null
      const projectId = parseField(body.projectId) || null
      const notes = parseField(body.notes) || null

      const id = crypto.randomUUID()
      const now = nowIso()

      let receiptPath: string | null = null
      const receipt = body.receipt as
        | { mimetype?: string; toBuffer?: () => Promise<Buffer>; filename?: string }
        | undefined
      if (receipt && typeof receipt.toBuffer === 'function') {
        const mime = (receipt.mimetype ?? '').toLowerCase()
        if (!ALLOWED_RECEIPT_MIME.has(mime)) {
          return reply
            .code(415)
            .send({ error: `unsupported receipt mime type ${mime}` })
        }
        const ext = EXT_BY_MIME[mime] ?? 'bin'
        const userDir = path.join(getReceiptDir(), userId)
        fs.mkdirSync(userDir, { recursive: true })
        const target = path.join(userDir, `${id}.${ext}`)
        const buf = await receipt.toBuffer()
        if (buf.length > MAX_RECEIPT_BYTES)
          return reply.code(413).send({ error: 'receipt exceeds size limit' })
        fs.writeFileSync(target, buf)
        receiptPath = target
      }

      db.prepare(
        `INSERT INTO expenses
           (id, user_id, client_id, project_id, category_id, vendor, description,
            amount, currency, expense_date, is_billable, receipt_path, notes,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        userId,
        clientId,
        projectId,
        categoryId,
        vendor,
        description || null,
        amount,
        currency,
        expenseDate,
        isBillable,
        receiptPath,
        notes,
        now,
        now,
      )

      recordAudit(db, {
        actorUserId: userId,
        action: 'expense.created',
        entityType: 'expense',
        entityId: id,
        metadata: { amount, currency, isBillable: isBillable === 1 },
      })

      const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow
      return reply.code(201).send({ expense: toApi(row) })
    })
  })

  // Convert a billable expense into an invoice line item.
  app.post('/api/invoices/:id/items/from-expense', async (req, reply) => {
    const userId = (req as AuthenticatedRequest).authUserId
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const invoiceId = (req.params as IdParams).id
    const body = (req.body ?? {}) as { expenseId?: string }
    const expenseId = String(body.expenseId ?? '')
    if (!expenseId) return reply.code(400).send({ error: 'expenseId is required' })

    const inv = db
      .prepare('SELECT user_id, status FROM invoices WHERE id = ?')
      .get(invoiceId) as { user_id: string; status: string } | undefined
    if (!inv) return reply.code(404).send({ error: 'Invoice not found' })
    if (inv.user_id !== userId) return reply.code(403).send({ error: 'Forbidden' })
    if (inv.status !== 'draft')
      return reply
        .code(409)
        .send({ error: 'Only draft invoices accept new line items', status: inv.status })

    const exp = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(expenseId) as ExpenseRow | undefined
    if (!exp) return reply.code(404).send({ error: 'Expense not found' })
    if (exp.user_id !== userId)
      return reply.code(403).send({ error: 'Forbidden' })
    if (!exp.is_billable)
      return reply.code(400).send({ error: 'Expense is not billable' })
    if (exp.invoiced_on_invoice_id)
      return reply.code(409).send({
        error: 'Expense already invoiced',
        invoiceId: exp.invoiced_on_invoice_id,
      })

    const itemId = crypto.randomUUID()
    const now = nowIso()
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO invoice_items
           (id, invoice_id, description, quantity, price, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        itemId,
        invoiceId,
        exp.description ?? exp.vendor ?? 'Expense',
        1,
        exp.amount,
        exp.amount,
        now,
      )
      db.prepare(
        `UPDATE expenses SET invoiced_on_invoice_id = ?, updated_at = ? WHERE id = ?`,
      ).run(invoiceId, now, expenseId)
    })
    tx()

    recordAudit(db, {
      actorUserId: userId,
      action: 'expense.invoiced',
      entityType: 'expense',
      entityId: expenseId,
      metadata: { invoiceId, amount: exp.amount },
    })

    return reply
      .code(201)
      .send({ itemId, expenseId, invoiceId, amount: exp.amount })
  })
}
