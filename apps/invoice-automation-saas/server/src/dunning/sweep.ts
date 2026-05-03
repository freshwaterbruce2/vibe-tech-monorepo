import type Database from 'better-sqlite3'

import { enqueueJob } from '../jobs/enqueue.js'
import { getPolicy } from './policy.js'

interface OverdueInvoiceRow {
  id: string
  user_id: string
  due_date: string
  status: string
}

interface SentStepRow {
  reminder_step: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface SweepResult {
  invoicesScanned: number
  remindersEnqueued: number
}

export const runDunningSweep = (
  db: Database.Database,
  now: Date = new Date(),
): SweepResult => {
  const nowIso = now.toISOString()
  const overdue = db
    .prepare(
      `SELECT id, user_id, due_date, status
         FROM invoices
        WHERE status = 'sent'
          AND due_date < ?
        ORDER BY due_date ASC`,
    )
    .all(nowIso.slice(0, 10)) as OverdueInvoiceRow[]

  let remindersEnqueued = 0

  for (const invoice of overdue) {
    const policy = getPolicy(db, invoice.user_id)
    if (!policy.enabled) continue

    const dueMs = new Date(invoice.due_date).getTime()
    const daysOverdue = Math.floor((now.getTime() - dueMs) / MS_PER_DAY)
    if (daysOverdue < 1) continue

    const sentSteps = db
      .prepare(
        'SELECT reminder_step FROM dunning_history WHERE invoice_id = ?',
      )
      .all(invoice.id) as SentStepRow[]
    const sentStepsSet = new Set(sentSteps.map((s) => s.reminder_step))

    for (let i = 0; i < policy.reminders.length; i++) {
      const reminderStep = i + 1
      const reminder = policy.reminders[i]
      if (!reminder) continue
      if (sentStepsSet.has(reminderStep)) continue
      if (daysOverdue < reminder.daysAfterDue) continue

      const insert = db.prepare(
        `INSERT OR IGNORE INTO dunning_history
           (id, invoice_id, reminder_step, sent_at)
         VALUES (?, ?, ?, ?)`,
      )
      const inserted = insert.run(
        crypto.randomUUID(),
        invoice.id,
        reminderStep,
        nowIso,
      )
      if (inserted.changes === 0) continue

      enqueueJob(db, {
        type: 'email.overdue',
        payload: {
          invoiceId: invoice.id,
          reminderStep,
          daysOverdue,
        },
      })
      remindersEnqueued++
      break
    }
  }

  return { invoicesScanned: overdue.length, remindersEnqueued }
}
