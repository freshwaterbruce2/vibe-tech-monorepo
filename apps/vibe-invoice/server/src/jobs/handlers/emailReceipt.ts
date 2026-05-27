import { sendPaymentReceipt } from '../../email/send.js'
import { registerHandler } from './index.js'

interface EmailReceiptPayload {
  invoiceId: string
  paidAt: string
}

registerHandler<EmailReceiptPayload>('email.receipt', async (payload, ctx) => {
  await sendPaymentReceipt(ctx.db, payload.invoiceId, payload.paidAt)
})
