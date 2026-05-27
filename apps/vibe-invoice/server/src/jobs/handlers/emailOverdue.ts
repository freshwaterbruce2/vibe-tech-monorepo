import { sendOverdueReminder } from '../../email/send.js'
import type { ReminderStep } from '../../email/render.js'
import { registerHandler } from './index.js'

interface EmailOverduePayload {
  invoiceId: string
  reminderStep: ReminderStep
  daysOverdue: number
}

registerHandler<EmailOverduePayload>('email.overdue', async (payload, ctx) => {
  await sendOverdueReminder(
    ctx.db,
    payload.invoiceId,
    payload.reminderStep,
    payload.daysOverdue,
  )
})
