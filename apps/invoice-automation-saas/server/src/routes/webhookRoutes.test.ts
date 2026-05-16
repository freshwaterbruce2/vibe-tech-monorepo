// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runMigrations } from '../migrations/index.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const TEST_WEBHOOK_SECRET = 'whsec_test_dummy_secret_for_signing'

describe('Stripe webhook route', () => {
  let db: Database.Database
  let tmpDir: string
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iaas-wh-'))
    db = new Database(path.join(tmpDir, 'test.db'))
    db.pragma('foreign_keys = ON')
    runMigrations(db, migrationsDir)

    db.prepare(
      `INSERT INTO users (id, email, password_salt, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'user-1',
      'u@example.com',
      Buffer.from('salt'),
      Buffer.from('hash'),
      new Date().toISOString(),
      new Date().toISOString(),
    )
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'client-1',
      'user-1',
      'Acme',
      'acme@example.com',
      new Date().toISOString(),
      new Date().toISOString(),
    )
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES (?, ?, 'INV-100', 'client-1', '2026-05-01', '2026-05-31',
               100, 0, 100, 'sent', 'USD', ?, ?)`,
    ).run(
      'inv-1',
      'user-1',
      new Date().toISOString(),
      new Date().toISOString(),
    )

    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_webhook_tests'

    vi.resetModules()
    const { registerWebhookRoutes } = await import('./webhookRoutes.js')
    app = Fastify({ logger: false })
    await registerWebhookRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app?.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_SECRET_KEY
  })

  const sendSignedEvent = async (eventPayload: Record<string, unknown>) => {
    const rawBody = Buffer.from(JSON.stringify(eventPayload), 'utf8')
    const stripe = new Stripe('sk_test_dummy', { apiVersion: '2025-08-27.basil' })
    const header = stripe.webhooks.generateTestHeaderString({
      payload: rawBody.toString(),
      secret: TEST_WEBHOOK_SECRET,
    })
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': header, 'content-type': 'application/json' },
      payload: rawBody,
    })
  }

  it('rejects requests without a stripe-signature header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(400)
  })

  it('rejects requests with an invalid signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: {
        'stripe-signature': 't=1,v1=invalid',
        'content-type': 'application/json',
      },
      payload: '{}',
    })
    expect(res.statusCode).toBe(400)
  })

  it('marks invoice paid + writes payment + audit on checkout.session.completed', async () => {
    const event = {
      id: 'evt_test_001',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_001',
          object: 'checkout.session',
          amount_total: 10000,
          currency: 'usd',
          payment_intent: 'pi_test_001',
          metadata: { invoice_id: 'inv-1' },
        },
      },
    }

    const res = await sendSignedEvent(event)
    expect(res.statusCode).toBe(200)

    const invoice = db
      .prepare('SELECT status FROM invoices WHERE id = ?')
      .get('inv-1') as { status: string }
    expect(invoice.status).toBe('paid')

    const payment = db
      .prepare(
        'SELECT amount, currency, method, stripe_checkout_session_id FROM payments WHERE invoice_id = ?',
      )
      .get('inv-1') as {
      amount: number
      currency: string
      method: string
      stripe_checkout_session_id: string
    }
    expect(payment.amount).toBe(100)
    expect(payment.currency).toBe('USD')
    expect(payment.method).toBe('stripe')
    expect(payment.stripe_checkout_session_id).toBe('cs_test_001')

    const audit = db
      .prepare(
        `SELECT action, entity_type, entity_id, metadata_json
           FROM audit_log WHERE entity_id = ?`,
      )
      .get('inv-1') as {
      action: string
      entity_type: string
      entity_id: string
      metadata_json: string
    }
    expect(audit.action).toBe('invoice.paid')
    expect(JSON.parse(audit.metadata_json).stripe_event_id).toBe('evt_test_001')
  })

  it('replays of the same Stripe event id are no-ops (idempotent)', async () => {
    const event = {
      id: 'evt_replay_test',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_replay_001',
          object: 'checkout.session',
          amount_total: 10000,
          currency: 'usd',
          payment_intent: 'pi_replay_001',
          metadata: { invoice_id: 'inv-1' },
        },
      },
    }

    const res1 = await sendSignedEvent(event)
    expect(res1.statusCode).toBe(200)
    const res2 = await sendSignedEvent(event)
    expect(res2.statusCode).toBe(200)
    const body2 = JSON.parse(res2.body) as { duplicate: boolean }
    expect(body2.duplicate).toBe(true)

    const paymentCount = db
      .prepare('SELECT COUNT(*) as c FROM payments WHERE invoice_id = ?')
      .get('inv-1') as { c: number }
    expect(paymentCount.c).toBe(1)
  })

  it('returns ok with error tag when invoice id is missing from session metadata', async () => {
    const event = {
      id: 'evt_no_meta',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_no_meta',
          object: 'checkout.session',
          amount_total: 10000,
          currency: 'usd',
          metadata: {},
        },
      },
    }

    const res = await sendSignedEvent(event)
    expect(res.statusCode).toBe(400)
  })

  it('ignores event types other than checkout.session.completed', async () => {
    const event = {
      id: 'evt_other_type',
      type: 'payment_intent.created',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'pi_x', object: 'payment_intent' } },
    }

    const res = await sendSignedEvent(event)
    expect(res.statusCode).toBe(200)

    const invoice = db
      .prepare('SELECT status FROM invoices WHERE id = ?')
      .get('inv-1') as { status: string }
    expect(invoice.status).toBe('sent')
  })
})
