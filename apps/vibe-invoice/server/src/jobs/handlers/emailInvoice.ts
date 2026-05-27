import { sendInvoiceCreated } from '../../email/send.js'
import { registerHandler } from './index.js'

interface EmailInvoicePayload {
  invoiceId: string
}

registerHandler<EmailInvoicePayload>('email.invoice', async (payload, ctx) => {
  await sendInvoiceCreated(ctx.db, payload.invoiceId)
})
