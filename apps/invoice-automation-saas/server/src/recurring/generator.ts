import type Database from 'better-sqlite3'
import { addDays } from 'date-fns'

interface ParentInvoiceRow {
  id: string
  user_id: string
  invoice_number: string
  client_id: string
  subtotal: number
  tax: number
  total: number
  notes: string | null
  terms: string | null
  currency: string
  due_date: string
  issue_date: string
}

interface ParentItemRow {
  description: string
  quantity: number
  price: number
  total: number
}

const computeDueOffsetDays = (issueDate: string, dueDate: string): number => {
  const issue = new Date(issueDate).getTime()
  const due = new Date(dueDate).getTime()
  const days = Math.round((due - issue) / (24 * 60 * 60 * 1000))
  return Number.isFinite(days) && days >= 0 ? days : 30
}

const isInvoiceNumberTaken = (
  db: Database.Database,
  userId: string,
  invoiceNumber: string,
): boolean => {
  const row = db
    .prepare(
      'SELECT 1 as found FROM invoices WHERE user_id = ? AND invoice_number = ? LIMIT 1',
    )
    .get(userId, invoiceNumber) as { found: number } | undefined
  return Boolean(row)
}

export const generateNextInvoiceNumber = (
  db: Database.Database,
  userId: string,
  parentInvoiceNumber: string,
): string => {
  const trailingDigits = /^(.*?)(\d+)(\D*)$/.exec(parentInvoiceNumber)
  if (trailingDigits) {
    const prefix = trailingDigits[1] ?? ''
    const digits = trailingDigits[2] ?? '0'
    const suffix = trailingDigits[3] ?? ''
    const width = digits.length
    let n = parseInt(digits, 10) + 1
    for (let attempt = 0; attempt < 10000; attempt++) {
      const candidate = `${prefix}${String(n).padStart(width, '0')}${suffix}`
      if (!isInvoiceNumberTaken(db, userId, candidate)) {
        return candidate
      }
      n++
    }
  }

  for (let n = 2; n < 10000; n++) {
    const candidate = `${parentInvoiceNumber}-R${n}`
    if (!isInvoiceNumberTaken(db, userId, candidate)) {
      return candidate
    }
  }
  throw new Error(
    `generateNextInvoiceNumber: exhausted candidates for ${parentInvoiceNumber}`,
  )
}

export interface CloneOptions {
  issueDate?: Date
}

export const cloneInvoice = (
  db: Database.Database,
  parentInvoiceId: string,
  options: CloneOptions = {},
): { newInvoiceId: string; newInvoiceNumber: string } => {
  const parent = db
    .prepare(
      `SELECT id, user_id, invoice_number, client_id, subtotal, tax, total,
              notes, terms, currency, due_date, issue_date
         FROM invoices WHERE id = ?`,
    )
    .get(parentInvoiceId) as ParentInvoiceRow | undefined
  if (!parent) {
    throw new Error(`cloneInvoice: parent ${parentInvoiceId} not found`)
  }

  const items = db
    .prepare(
      'SELECT description, quantity, price, total FROM invoice_items WHERE invoice_id = ? ORDER BY created_at ASC',
    )
    .all(parentInvoiceId) as ParentItemRow[]

  const dueOffsetDays = computeDueOffsetDays(parent.issue_date, parent.due_date)
  const issueDate = options.issueDate ?? new Date()
  const dueDate = addDays(issueDate, dueOffsetDays)
  const newInvoiceId = crypto.randomUUID()
  const newPublicToken = crypto.randomUUID().replace(/-/g, '')
  const now = new Date().toISOString()
  const issueDateIso = issueDate.toISOString().slice(0, 10)
  const dueDateIso = dueDate.toISOString().slice(0, 10)

  const tx = db.transaction(() => {
    const newInvoiceNumber = generateNextInvoiceNumber(
      db,
      parent.user_id,
      parent.invoice_number,
    )

    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, notes, terms, currency,
          parent_invoice_id, public_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newInvoiceId,
      parent.user_id,
      newInvoiceNumber,
      parent.client_id,
      issueDateIso,
      dueDateIso,
      parent.subtotal,
      parent.tax,
      parent.total,
      parent.notes,
      parent.terms,
      parent.currency,
      parent.id,
      newPublicToken,
      now,
      now,
    )

    for (const item of items) {
      db.prepare(
        `INSERT INTO invoice_items
           (id, invoice_id, description, quantity, price, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        crypto.randomUUID(),
        newInvoiceId,
        item.description,
        item.quantity,
        item.price,
        item.total,
        now,
      )
    }

    return newInvoiceNumber
  })

  const newInvoiceNumber = tx()
  return { newInvoiceId, newInvoiceNumber }
}
