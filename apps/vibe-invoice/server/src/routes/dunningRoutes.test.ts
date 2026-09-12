// @vitest-environment node
import Database from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  draftPaymentReminder: vi.fn(),
}))

vi.mock('../clients/aiGateway.js', () => ({
  determineTone: (days: number, explicitTone?: string) => {
    if (explicitTone) return explicitTone
    if (days <= 7) return 'friendly'
    if (days <= 21) return 'firm'
    return 'urgent'
  },
  draftPaymentReminder: mocks.draftPaymentReminder,
}))

import { runMigrations } from '../migrations/index.js'
import { registerDunningRoutes } from './dunningRoutes.js'

describe('dunningRoutes integration tests with real SQLite', () => {
  let app: FastifyInstance
  let db: Database.Database
  let tmpDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.draftPaymentReminder.mockImplementation(async (input) => {
      const tone = input.tone || (input.overdueDays <= 7 ? 'friendly' : input.overdueDays <= 21 ? 'firm' : 'urgent')
      return {
        subject: `Payment Reminder: Invoice ${input.invoiceNumber}`,
        headline: `Invoice ${input.invoiceNumber} is ${input.overdueDays} days past due`,
        body: `Dear ${input.clientName}, please pay ${input.currency || 'USD'} ${input.amount}.`,
        suggestedTone: tone,
        overdueDays: input.overdueDays,
        amount: input.amount,
        currency: input.currency || 'USD',
        callToAction: 'Pay Now',
        fallbackUsed: false,
      }
    })

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dunning-test-'))
    db = new Database(path.join(tmpDir, 'test.db'))

    const migrationsDir = path.resolve(__dirname, '..', 'migrations')
    runMigrations(db, migrationsDir)

    // Seed test user
    db.prepare(
      `INSERT INTO users (id, email, full_name, company_name, password_salt, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'user-1',
      'user1@example.com',
      'Sarah Connor',
      'Resistance Tech',
      Buffer.from('salt'),
      Buffer.from('hash'),
      new Date().toISOString(),
      new Date().toISOString(),
    )

    // Seed test client
    db.prepare(
      `INSERT INTO clients (id, user_id, name, email, company, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'client-1',
      'user-1',
      'Cyberdyne Systems',
      'accounts@cyberdyne.com',
      'Cyberdyne Corp',
      new Date().toISOString(),
      new Date().toISOString(),
    )

    // Seed overdue invoice (20 days overdue)
    const pastDue = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    db.prepare(
      `INSERT INTO invoices
         (id, user_id, invoice_number, client_id, issue_date, due_date,
          subtotal, tax, total, status, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, '2026-08-01', ?, 5000, 0, 5000, 'overdue', 'USD', ?, ?)`,
    ).run(
      'inv-overdue',
      'user-1',
      'INV-2026-001',
      'client-1',
      pastDue,
      new Date().toISOString(),
      new Date().toISOString(),
    )

    app = Fastify()
    app.addHook('preHandler', async (req) => {
      (req as unknown as { authUserId: string }).authUserId = 'user-1'
    })
    registerDunningRoutes(app, db)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('generates an AI payment reminder smart draft from real invoice in database', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: {
        invoiceId: 'inv-overdue',
      },
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.draft).toBeDefined()
    expect(json.draft.amount).toBe(5000)
    expect(json.draft.currency).toBe('USD')
    expect(json.draft.suggestedTone).toBe('firm') // 20 days -> firm
    expect(json.draft.subject).toContain('INV-2026-001')
    expect(json.draft.body).toBeDefined()
    expect(json.draft.callToAction).toBeDefined()

    // Verify audit log record
    const audit = db
      .prepare(`SELECT * FROM audit_log WHERE action = 'dunning.smart_draft_generated'`)
      .get() as { entity_id: string; actor_user_id: string } | undefined
    expect(audit).toBeDefined()
    expect(audit?.entity_id).toBe('inv-overdue')
    expect(audit?.actor_user_id).toBe('user-1')
  })

  it('respects tone override and custom instructions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: {
        invoiceId: 'inv-overdue',
        tone: 'urgent',
        customInstructions: 'Mention that late fees will accrue next Monday.',
      },
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.draft.suggestedTone).toBe('urgent')
  })

  it('generates a draft with custom parameters without invoiceId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: {
        amount: 1200,
        currency: 'EUR',
        overdueDays: 4,
        clientName: 'EuroTech AG',
        invoiceNumber: 'INV-EU-88',
      },
    })

    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.draft.amount).toBe(1200)
    expect(json.draft.currency).toBe('EUR')
    expect(json.draft.suggestedTone).toBe('friendly') // 4 days -> friendly
  })
})
