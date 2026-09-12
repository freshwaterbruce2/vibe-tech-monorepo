// @vitest-environment node
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runMigrations } from '../migrations/index.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'server', 'src', 'migrations')

const TEST_SQUARE_WEBHOOK_SECRET = 'sq_test_webhook_secret_key_12345'

describe('Square Webhook Routes', () => {
  let db: Database.Database
  let tmpDir: string
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-wh-'))
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
      'Acme Corp',
      'acme@example.com',
      new Date().toISOString(),
      new Date().toISOString(),
    )
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES (?, ?, 'INV-SQ-100', 'client-1', '2026-05-01', '2026-05-31',
               150, 0, 150, 'sent', 'USD', ?, ?)`,
    ).run('inv-sq-1', 'user-1', new Date().toISOString(), new Date().toISOString())

    process.env.SQUARE_WEBHOOK_SECRET = TEST_SQUARE_WEBHOOK_SECRET
    process.env.SQUARE_ACCESS_TOKEN = 'sq_test_access_token'
    process.env.SQUARE_LOCATION_ID = 'sq_test_location'

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
    delete process.env.SQUARE_WEBHOOK_SECRET
    delete process.env.SQUARE_ACCESS_TOKEN
    delete process.env.SQUARE_LOCATION_ID
  })

  const sendSignedSquareEvent = async (eventPayload: Record<string, unknown>) => {
    const rawBody = Buffer.from(JSON.stringify(eventPayload), 'utf8')
    const signature = crypto
      .createHmac('sha256', TEST_SQUARE_WEBHOOK_SECRET)
      .update(rawBody.toString('utf8'), 'utf8')
      .digest('hex')

    return app.inject({
      method: 'POST',
      url: '/api/webhooks/square',
      headers: {
        'x-square-hmacsha256-signature': signature,
        'content-type': 'application/json',
      },
      payload: rawBody,
    })
  }

  it('rejects requests without x-square-hmacsha256-signature header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/square',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toContain('x-square-hmacsha256-signature')
  })

  it('rejects requests with an invalid signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/square',
      headers: {
        'x-square-hmacsha256-signature': 'invalid_sig',
        'content-type': 'application/json',
      },
      payload: '{}',
    })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).error).toBe('Invalid signature')
  })

  it('marks invoice paid and records square payment on payment.updated COMPLETED', async () => {
    const payload = {
      type: 'payment.updated',
      event_id: 'sq_event_001',
      data: {
        type: 'payment',
        id: 'payment_sq_123',
        object: {
          payment: {
            id: 'payment_sq_123',
            status: 'COMPLETED',
            amount_money: {
              amount: 15000,
              currency: 'USD',
            },
            order_id: 'sq_order_456',
            note: JSON.stringify({ invoice_id: 'inv-sq-1', invoice_number: 'INV-SQ-100' }),
          },
        },
      },
    }

    const res = await sendSignedSquareEvent(payload)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).ok).toBe(true)

    const inv = db
      .prepare('SELECT status FROM invoices WHERE id = ?')
      .get('inv-sq-1') as { status: string }
    expect(inv.status).toBe('paid')

    const payment = db
      .prepare('SELECT amount, currency, method, stripe_payment_intent_id FROM payments WHERE invoice_id = ?')
      .get('inv-sq-1') as { amount: number; currency: string; method: string; stripe_payment_intent_id: string }
    expect(payment.method).toBe('square')
    expect(payment.amount).toBe(150)
    expect(payment.currency).toBe('USD')
    expect(payment.stripe_payment_intent_id).toBe('payment_sq_123')

    const audit = db
      .prepare("SELECT metadata_json FROM audit_log WHERE entity_id = ? AND action = 'invoice.paid'")
      .get('inv-sq-1') as { metadata_json: string }
    expect(audit).toBeDefined()
    expect(JSON.parse(audit.metadata_json).source).toBe('square')
  })

  it('is idempotent on duplicate Square event delivery', async () => {
    const payload = {
      type: 'payment.updated',
      event_id: 'sq_event_dup',
      data: {
        object: {
          payment: {
            id: 'pay_dup',
            status: 'COMPLETED',
            amount_money: { amount: 15000, currency: 'USD' },
            note: JSON.stringify({ invoice_id: 'inv-sq-1' }),
          },
        },
      },
    }

    const first = await sendSignedSquareEvent(payload)
    expect(first.statusCode).toBe(200)
    expect(JSON.parse(first.body).duplicate).toBeUndefined()

    const second = await sendSignedSquareEvent(payload)
    expect(second.statusCode).toBe(200)
    expect(JSON.parse(second.body).duplicate).toBe(true)

    const count = db
      .prepare('SELECT count(*) as count FROM payments WHERE invoice_id = ?')
      .get('inv-sq-1') as { count: number }
    expect(count.count).toBe(1)
  })
})
