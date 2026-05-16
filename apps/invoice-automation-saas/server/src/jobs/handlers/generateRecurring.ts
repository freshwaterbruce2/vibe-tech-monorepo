import { cloneInvoice } from '../../recurring/generator.js'
import {
  computeAdvancement,
  updateScheduleAfterRun,
  type RecurringScheduleRow,
} from '../../recurring/scheduler.js'
import { recordAudit } from '../../audit.js'
import { enqueueJob } from '../enqueue.js'
import { registerHandler } from './index.js'

interface GenerateRecurringPayload {
  scheduleId: string
}

registerHandler<GenerateRecurringPayload>(
  'recurring.generate',
  async (payload, ctx) => {
    const { db } = ctx
    const schedule = db
      .prepare(
        `SELECT id, user_id, template_invoice_id, frequency, interval_count,
                next_run_at, end_type, end_date, occurrences_remaining, status
           FROM recurring_schedules WHERE id = ?`,
      )
      .get(payload.scheduleId) as RecurringScheduleRow | undefined

    if (!schedule) {
      throw new Error(`recurring.generate: schedule ${payload.scheduleId} not found`)
    }
    if (schedule.status !== 'active') {
      return
    }

    const generatedAt = new Date()
    const { newInvoiceId, newInvoiceNumber } = cloneInvoice(
      db,
      schedule.template_invoice_id,
    )

    const advancement = computeAdvancement(schedule, generatedAt)
    updateScheduleAfterRun(db, schedule.id, advancement)

    recordAudit(db, {
      action: 'recurring.invoice_generated',
      entityType: 'recurring_schedule',
      entityId: schedule.id,
      actorUserId: schedule.user_id,
      metadata: {
        new_invoice_id: newInvoiceId,
        new_invoice_number: newInvoiceNumber,
        new_status: advancement.newStatus,
      },
    })

    enqueueJob(db, {
      type: 'email.invoice',
      payload: { invoiceId: newInvoiceId },
    })
  },
)
