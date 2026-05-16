import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

import { recordAudit } from '../audit.js'
import { buildCheckoutSession } from '../payments/stripeAdapter.js'

interface InvoiceRow {
  id: string
  user_id: string
  total: number
  currency: string
  invoice_number: string
  status: string
  public_token: string | null
}

interface ClientRow {
  email: string | null
}

interface CheckoutBody {
  token?: string
}

const getAppBaseUrl = (): string =>
  process.env.APP_BASE_URL ?? 'http://localhost:5173'

export const registerPaymentRoutes = (
  app: FastifyInstance,
  db: Database.Database,
): void => {
  app.post(
    '/api/public/invoices/:id/checkout-session',
    async (req, reply) => {
      const id = (req.params as { id: string }).id
      const body = (req.body ?? {}) as CheckoutBody
      const token = String(body.token ?? '')

      if (!token) {
        return reply.code(400).send({ error: 'token is required' })
      }

      const invoice = db
        .prepare(
          `SELECT id, user_id, total, currency, invoice_number, status, public_token
             FROM invoices WHERE id = ?`,
        )
        .get(id) as InvoiceRow | undefined

      if (!invoice) {
        return reply.code(404).send({ error: 'Not found' })
      }
      if (invoice.status === 'paid') {
        return reply.code(409).send({ error: 'Invoice is already paid' })
      }
      if (invoice.status === 'draft') {
        return reply.code(403).send({ error: 'Not available' })
      }
      if (invoice.public_token !== token) {
        return reply.code(403).send({ error: 'Invalid token' })
      }

      const client = db
        .prepare(
          `SELECT c.email FROM clients c
             JOIN invoices i ON i.client_id = c.id
            WHERE i.id = ?`,
        )
        .get(id) as ClientRow | undefined

      const baseUrl = getAppBaseUrl()
      try {
        const session = await buildCheckoutSession({
          invoiceId: id,
          publicToken: token,
          amount: invoice.total,
          currency: invoice.currency,
          invoiceNumber: invoice.invoice_number,
          successUrl: `${baseUrl}/pay/${id}?token=${token}&status=success`,
          cancelUrl: `${baseUrl}/pay/${id}?token=${token}&status=canceled`,
          customerEmail: client?.email ?? undefined,
        })

        recordAudit(db, {
          action: 'payment.checkout_session_created',
          entityType: 'invoice',
          entityId: id,
          actorUserId: null,
          metadata: { stripe_session_id: session.id },
        })

        return { url: session.url }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        req.log.error({ err: e, invoiceId: id }, 'Stripe checkout session failed')
        return reply.code(502).send({
          error: 'Could not create payment session',
          detail: msg,
        })
      }
    },
  )
}
