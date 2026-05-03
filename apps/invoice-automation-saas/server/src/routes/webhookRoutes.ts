import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import type Stripe from 'stripe'

import { recordAudit } from '../audit.js'
import { events } from '../events.js'
import { verifyWebhookSignature } from '../payments/stripeAdapter.js'

interface InvoiceRow {
  id: string
  user_id: string
  currency: string
}

const getWebhookSecret = (): string => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return secret
}

export const registerWebhookRoutes = async (
  parent: FastifyInstance,
  db: Database.Database,
): Promise<void> => {
  await parent.register(async (instance) => {
    instance.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => {
        done(null, body)
      },
    )

    instance.post('/api/webhooks/stripe', async (req, reply) => {
      const sig = req.headers['stripe-signature']
      if (!sig || typeof sig !== 'string') {
        return reply.code(400).send({ error: 'Missing stripe-signature header' })
      }

      let secret: string
      try {
        secret = getWebhookSecret()
      } catch (e) {
        req.log.error({ err: e }, 'Stripe webhook secret missing')
        return reply.code(500).send({ error: 'Server misconfigured' })
      }

      let event: Stripe.Event
      try {
        event = verifyWebhookSignature(req.body as Buffer, sig, secret)
      } catch (e) {
        req.log.warn({ err: e }, 'Invalid Stripe webhook signature')
        return reply.code(400).send({ error: 'Invalid signature' })
      }

      const insertEvent = db.prepare(
        `INSERT OR IGNORE INTO stripe_events (event_id, event_type, payload_json, processed_at)
         VALUES (?, ?, ?, ?)`,
      )
      const inserted = insertEvent.run(
        event.id,
        event.type,
        JSON.stringify(event),
        new Date().toISOString(),
      )
      if (inserted.changes === 0) {
        req.log.info({ eventId: event.id }, 'Duplicate Stripe webhook, skipping')
        return { ok: true, duplicate: true }
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const invoiceId = session.metadata?.invoice_id
        if (!invoiceId) {
          req.log.error(
            { eventId: event.id },
            'checkout.session.completed missing invoice_id metadata',
          )
          return reply.code(400).send({ error: 'Missing invoice_id metadata' })
        }

        const invoice = db
          .prepare('SELECT id, user_id, currency FROM invoices WHERE id = ?')
          .get(invoiceId) as InvoiceRow | undefined

        if (!invoice) {
          req.log.error(
            { invoiceId, eventId: event.id },
            'Webhook references unknown invoice',
          )
          return { ok: true, error: 'invoice_not_found' }
        }

        const amountMajor = (session.amount_total ?? 0) / 100
        const currency = (session.currency ?? invoice.currency).toUpperCase()
        const now = new Date().toISOString()
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null

        const tx = db.transaction(() => {
          db.prepare(
            `INSERT INTO payments
              (id, invoice_id, amount, currency, method,
               stripe_payment_intent_id, stripe_checkout_session_id, created_at)
             VALUES (?, ?, ?, ?, 'stripe', ?, ?, ?)`,
          ).run(
            crypto.randomUUID(),
            invoiceId,
            amountMajor,
            currency,
            paymentIntentId,
            session.id,
            now,
          )

          db.prepare(
            "UPDATE invoices SET status='paid', updated_at=? WHERE id=?",
          ).run(now, invoiceId)

          recordAudit(db, {
            action: 'invoice.paid',
            entityType: 'invoice',
            entityId: invoiceId,
            actorUserId: null,
            metadata: {
              source: 'stripe',
              stripe_event_id: event.id,
              stripe_session_id: session.id,
              amount: amountMajor,
              currency,
            },
          })
        })
        tx()

        events.emitEvent({ type: 'invoices:changed', userId: invoice.user_id })
      }

      return { ok: true }
    })
  })
}
