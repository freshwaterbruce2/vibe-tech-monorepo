/**
 * Active-project-lock verification harness.
 *
 * Exercises the 6 manual criteria still flagged unsatisfied in
 * D:\active-project\active-project.json against an isolated test DB and
 * emits a pass/fail report.
 *
 * Usage:  pnpm --filter invoice-automation-saas exec tsx server/scripts/verify-criteria.ts
 */

import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
const SERVER_SRC = resolve(HERE, '..', 'src')
const MIGRATIONS_DIR = resolve(SERVER_SRC, 'migrations')
const VERIFY_DB_PATH = 'D:\\databases\\invoiceflow-verify.db'

// Env MUST be set before any module that reads it is imported.
process.env.DATABASE_PATH = VERIFY_DB_PATH
process.env.STRIPE_SECRET_KEY = 'sk_test_verify_dummy'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_verify_secret'
process.env.RESEND_API_KEY = 're_test_verify_dummy'
// svix expects whsec_<base64>; generate a stable one for the run
process.env.RESEND_WEBHOOK_SECRET =
  'whsec_' + Buffer.from('verify-harness-resend-secret-32B!').toString('base64')
process.env.EMAIL_FROM = 'invoices@verify.local'
process.env.APP_BASE_URL = 'http://localhost:5173'

mkdirSync(dirname(VERIFY_DB_PATH), { recursive: true })
for (const ext of ['', '-shm', '-wal']) {
  const p = VERIFY_DB_PATH + ext
  if (existsSync(p)) rmSync(p)
}

const Database = (await import('better-sqlite3')).default
const { runMigrations } = await import('../src/migrations/index.js')
const { recordAudit, queryAudit } = await import('../src/audit.js')
const { enqueueJob } = await import('../src/jobs/enqueue.js')
const { tick } = await import('../src/jobs/runner.js')
const handlers = await import('../src/jobs/handlers/index.js')
const { cloneInvoice } = await import('../src/recurring/generator.js')
const recurringScheduler = await import('../src/recurring/scheduler.js')
const { runDunningSweep } = await import('../src/dunning/sweep.js')
const { renderInvoicePdfBuffer } = await import('../src/pdf/render.js')
const emailRender = await import('../src/email/render.js')
const stripeAdapter = await import('../src/payments/stripeAdapter.js')

interface CritResult {
  id: string
  description: string
  ok: boolean
  evidence: string[]
  error?: string
}

const results: CritResult[] = []

const newId = () => crypto.randomUUID()
const isoNow = () => new Date().toISOString()
const isoDays = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

const seed = (db: any) => {
  const userId = newId()
  const clientId = newId()
  const invoiceId = newId()
  const now = isoNow()
  db.prepare(
    `INSERT INTO users (id, email, full_name, company_name, password_salt, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    `verify-${userId.slice(0, 8)}@verify.local`,
    'Verify User',
    'Verify Co',
    Buffer.from('salt'),
    Buffer.from('hash'),
    now,
    now,
  )
  db.prepare(
    `INSERT INTO clients (id, user_id, name, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(clientId, userId, 'Recipient', 'recipient@verify.local', now, now)
  db.prepare(
    `INSERT INTO invoices
       (id, user_id, invoice_number, client_id, issue_date, due_date,
        subtotal, tax, total, status, currency, public_token, created_at, updated_at)
     VALUES (?, ?, 'INV-0001', ?, ?, ?, 100, 0, 100, 'sent', 'USD', ?, ?, ?)`,
  ).run(
    invoiceId,
    userId,
    clientId,
    isoDays(0),
    isoDays(30),
    'tok_' + invoiceId.replace(/-/g, ''),
    now,
    now,
  )
  db.prepare(
    `INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(newId(), invoiceId, 'Consulting', 1, 100, 100, now)
  return { userId, clientId, invoiceId }
}

const run = async (
  id: string,
  description: string,
  fn: () => Promise<string[]>,
): Promise<void> => {
  const ev: string[] = []
  try {
    const result = await fn()
    results.push({ id, description, ok: true, evidence: [...ev, ...result] })
    process.stdout.write(`PASS ${id}\n`)
  } catch (e) {
    const msg = e instanceof Error ? e.message + '\n' + e.stack : String(e)
    results.push({ id, description, ok: false, evidence: ev, error: msg })
    process.stdout.write(`FAIL ${id} - ${(e as Error).message}\n`)
  }
}

const must = (cond: unknown, msg: string): void => {
  if (!cond) throw new Error(msg)
}

const main = async () => {
  const db = new Database(VERIFY_DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const mig = runMigrations(db, MIGRATIONS_DIR)
  process.stdout.write(`migrations applied: ${mig.applied.length}, skipped: ${mig.skipped.length}\n`)

  // ---- t0-job-runner -------------------------------------------------------
  await run(
    't0-job-runner',
    'jobs run once on schedule, retry with exp. backoff, fail at max_attempts, no double-execute',
    async () => {
      handlers.clearHandlers()
      const ev: string[] = []

      // 1. runs once
      let calls = 0
      handlers.registerHandler<{ x: number }>('verify.echo', async (p) => {
        ev.push(`echo handler ran with x=${p.x}`)
        calls++
      })
      enqueueJob(db, { type: 'verify.echo', payload: { x: 7 } })
      const r1 = await tick(db)
      must(r1.succeeded === 1, `expected 1 succeeded, got ${r1.succeeded}`)
      must(calls === 1, `expected 1 call, got ${calls}`)
      ev.push(`tick #1: ${JSON.stringify(r1)}`)

      // 2. exponential backoff
      handlers.registerHandler('verify.boom', async () => {
        throw new Error('boom')
      })
      enqueueJob(db, { type: 'verify.boom', maxAttempts: 3 })
      const beforeMs = Date.now()
      const r2 = await tick(db)
      must(r2.retried === 1, `expected retry, got ${JSON.stringify(r2)}`)
      const row1 = db
        .prepare(
          `SELECT status, attempts, next_run_at FROM jobs WHERE type='verify.boom'`,
        )
        .get() as { status: string; attempts: number; next_run_at: string }
      must(row1.status === 'pending', `expected pending, got ${row1.status}`)
      must(row1.attempts === 1, `expected attempts=1, got ${row1.attempts}`)
      const nextMs = new Date(row1.next_run_at).getTime()
      must(
        nextMs > beforeMs + 30_000,
        `expected backoff >30s, got next=${row1.next_run_at}`,
      )
      ev.push(
        `backoff: attempts=1, next_run_at ${row1.next_run_at} (>${(nextMs - beforeMs) / 1000}s ahead)`,
      )

      // 3. fails at max_attempts
      db.prepare(
        `UPDATE jobs SET next_run_at=datetime('now','-1 hour') WHERE type='verify.boom'`,
      ).run()
      await tick(db) // attempt 2 -> pending
      db.prepare(
        `UPDATE jobs SET next_run_at=datetime('now','-1 hour') WHERE type='verify.boom'`,
      ).run()
      const r3 = await tick(db) // attempt 3 -> failed
      must(r3.failed === 1, `expected failed=1, got ${JSON.stringify(r3)}`)
      const row2 = db
        .prepare(`SELECT status, attempts FROM jobs WHERE type='verify.boom'`)
        .get() as { status: string; attempts: number }
      must(row2.status === 'failed', `expected failed, got ${row2.status}`)
      ev.push(`max_attempts honored: status=failed, attempts=${row2.attempts}`)

      // 4. no double-execute
      let onceCalls = 0
      handlers.registerHandler('verify.once', async () => {
        onceCalls++
      })
      enqueueJob(db, { type: 'verify.once' })
      await tick(db)
      await tick(db)
      must(onceCalls === 1, `expected 1 call, got ${onceCalls}`)
      ev.push('two sequential ticks executed handler exactly once')

      // 5. reclaims stuck job after lock expires
      let stuckCalls = 0
      handlers.registerHandler('verify.stuck', async () => {
        stuckCalls++
      })
      enqueueJob(db, { type: 'verify.stuck' })
      db.prepare(
        `UPDATE jobs SET status='running', locked_until=datetime('now','-1 hour')
         WHERE type='verify.stuck'`,
      ).run()
      await tick(db)
      must(stuckCalls === 1, `expected stuck reclaim, got ${stuckCalls}`)
      ev.push('expired lock reclaimed and processed once')

      return ev
    },
  )

  // ---- t0-audit-log --------------------------------------------------------
  await run(
    't0-audit-log',
    'audit_log table exists, recordAudit inserts, query retrieves, schema as specified',
    async () => {
      const ev: string[] = []
      const cols = db.pragma('table_info(audit_log)') as Array<{ name: string }>
      const colNames = cols.map((c) => c.name).sort()
      const expected = [
        'action',
        'actor_user_id',
        'created_at',
        'entity_id',
        'entity_type',
        'id',
        'ip',
        'metadata_json',
        'user_agent',
      ]
      for (const c of expected) {
        must(colNames.includes(c), `audit_log missing column ${c}`)
      }
      ev.push(`columns: ${colNames.join(',')}`)

      const rec = recordAudit(db, {
        action: 'test.record',
        entityType: 'invoice',
        entityId: 'inv-verify-1',
        actorUserId: 'user-verify-1',
        metadata: { foo: 'bar', n: 42 },
      })
      must(rec.id.length > 0, 'recordAudit did not return id')

      const found = queryAudit(db, { entityId: 'inv-verify-1' })
      must(found.length === 1, `expected 1 row, got ${found.length}`)
      must(found[0]!.action === 'test.record', 'wrong action retrieved')
      must(
        (found[0]!.metadata as Record<string, unknown>).foo === 'bar',
        'metadata round-trip failed',
      )
      ev.push(`recordAudit + queryAudit roundtrip: ${rec.id}`)

      return ev
    },
  )

  // ---- t1-stripe-end-to-end ------------------------------------------------
  await run(
    't1-stripe-end-to-end',
    'webhook verifies signature, dedupes, flips invoice to paid, writes audit, enqueues receipt',
    async () => {
      const ev: string[] = []

      const Fastify = (await import('fastify')).default
      const { registerWebhookRoutes } = await import('../src/routes/webhookRoutes.js')

      // ensure handler is registered (the file registers on import)
      await import('../src/jobs/handlers/emailReceipt.js')

      const seeded = seed(db)
      ev.push(`seeded invoice ${seeded.invoiceId}`)

      const app = Fastify({ logger: false })
      await registerWebhookRoutes(app, db)
      await app.ready()

      const session = {
        id: 'cs_test_' + crypto.randomBytes(8).toString('hex'),
        object: 'checkout.session',
        amount_total: 10000,
        currency: 'usd',
        payment_intent: 'pi_test_' + crypto.randomBytes(8).toString('hex'),
        metadata: { invoice_id: seeded.invoiceId },
      }
      const eventId = 'evt_test_' + crypto.randomBytes(8).toString('hex')
      const event = {
        id: eventId,
        object: 'event',
        type: 'checkout.session.completed',
        api_version: '2026-04-22.dahlia',
        created: Math.floor(Date.now() / 1000),
        data: { object: session },
      }
      const rawBody = Buffer.from(JSON.stringify(event), 'utf8')
      const ts = Math.floor(Date.now() / 1000).toString()
      const payloadToSign = `${ts}.${rawBody.toString('utf8')}`
      const signed = crypto
        .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET!)
        .update(payloadToSign)
        .digest('hex')
      const stripeSig = `t=${ts},v1=${signed}`

      // verify our signing matches what stripeAdapter.verifyWebhookSignature accepts
      const verified = stripeAdapter.verifyWebhookSignature(
        rawBody,
        stripeSig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
      must(verified.id === eventId, 'verifyWebhookSignature returned wrong event')
      ev.push(`local sig roundtrip OK (event ${eventId})`)

      const resp = await app.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: {
          'stripe-signature': stripeSig,
          'content-type': 'application/json',
        },
        payload: rawBody,
      })
      must(
        resp.statusCode === 200,
        `expected 200, got ${resp.statusCode}: ${resp.body}`,
      )

      const inv = db
        .prepare(`SELECT status FROM invoices WHERE id = ?`)
        .get(seeded.invoiceId) as { status: string }
      must(inv.status === 'paid', `invoice status ${inv.status} (expected paid)`)
      ev.push(`invoice flipped to paid`)

      const pay = db
        .prepare(
          `SELECT id, amount, currency, method, stripe_checkout_session_id
             FROM payments WHERE invoice_id = ?`,
        )
        .get(seeded.invoiceId) as
        | {
            id: string
            amount: number
            currency: string
            method: string
            stripe_checkout_session_id: string
          }
        | undefined
      must(pay !== undefined, 'no payments row written')
      must(pay!.amount === 100, `expected amount 100, got ${pay!.amount}`)
      must(pay!.currency === 'USD', `expected USD, got ${pay!.currency}`)
      must(pay!.method === 'stripe', `expected stripe, got ${pay!.method}`)
      must(
        pay!.stripe_checkout_session_id === session.id,
        `wrong session id stored`,
      )
      ev.push(`payments row: amount=${pay!.amount} ${pay!.currency} via ${pay!.method}`)

      const audit = queryAudit(db, { entityId: seeded.invoiceId, action: 'invoice.paid' })
      must(audit.length === 1, `expected 1 audit row, got ${audit.length}`)
      const audMeta = audit[0]!.metadata as Record<string, unknown>
      must(audMeta.stripe_event_id === eventId, 'audit metadata missing stripe_event_id')
      ev.push(`audit row written with stripe_event_id=${eventId}`)

      const stripeEvt = db
        .prepare(`SELECT event_id FROM stripe_events WHERE event_id = ?`)
        .get(eventId)
      must(stripeEvt !== undefined, 'stripe_events row missing')
      ev.push(`stripe_events deduplication row present`)

      // Replay: same event id should be a no-op
      const replay = await app.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: {
          'stripe-signature': stripeSig,
          'content-type': 'application/json',
        },
        payload: rawBody,
      })
      must(replay.statusCode === 200, `replay got ${replay.statusCode}`)
      must(
        JSON.parse(replay.body).duplicate === true,
        `replay should report duplicate=true, body=${replay.body}`,
      )
      const payCount = (
        db
          .prepare(`SELECT COUNT(*) as n FROM payments WHERE invoice_id=?`)
          .get(seeded.invoiceId) as { n: number }
      ).n
      must(payCount === 1, `replay duplicated payments row (count=${payCount})`)
      ev.push('replay was no-op (duplicate=true, payments still 1)')

      // bad signature => 400
      const bad = await app.inject({
        method: 'POST',
        url: '/api/webhooks/stripe',
        headers: {
          'stripe-signature': 't=0,v1=0000',
          'content-type': 'application/json',
        },
        payload: rawBody,
      })
      must(bad.statusCode === 400, `bad sig got ${bad.statusCode}`)
      ev.push('invalid signature rejected with 400')

      // email.receipt enqueued
      const queued = (
        db
          .prepare(
            `SELECT COUNT(*) as n FROM jobs WHERE type='email.receipt'
              AND payload_json LIKE ?`,
          )
          .get(`%${seeded.invoiceId}%`) as { n: number }
      ).n
      must(queued >= 1, `expected email.receipt enqueued, got ${queued}`)
      ev.push(`email.receipt job enqueued (${queued})`)

      await app.close()
      return ev
    },
  )

  // ---- t1-emails-with-pdf --------------------------------------------------
  await run(
    't1-emails-with-pdf',
    'PDF buffer renders, react-email renders, Resend webhook signature verifies and updates email_log',
    async () => {
      const ev: string[] = []

      // 1. PDF buffer
      const pdfBuf = await renderInvoicePdfBuffer(
        {
          invoiceNumber: 'V-0001',
          issueDate: isoDays(0),
          dueDate: isoDays(30),
          client: { name: 'Verify Client', email: 'c@verify.local' },
          subtotal: 100,
          tax: 0,
          total: 100,
          currency: 'USD',
          taxStrategy: 'invoice',
          userCurrencyAtIssue: null,
          exchangeRateToUserCurrency: null,
          notes: null,
          terms: null,
        },
        [
          {
            description: 'Hours',
            quantity: 1,
            unitPrice: 100,
            total: 100,
            taxAmount: 0,
          },
        ],
      )
      must(Buffer.isBuffer(pdfBuf), 'PDF render returned non-Buffer')
      must(pdfBuf.length > 1000, `PDF buffer too small: ${pdfBuf.length}`)
      must(pdfBuf.subarray(0, 4).toString() === '%PDF', 'PDF header missing')
      ev.push(`PDF rendered: ${pdfBuf.length} bytes, starts with %PDF`)

      // 2. React Email templates
      for (const [name, tpl] of [
        [
          'InvoiceCreated',
          emailRender.InvoiceCreated({
            invoiceNumber: 'V-0001',
            clientName: 'Acme',
            total: 100,
            currency: 'USD',
            dueDate: isoDays(30),
            payUrl: 'http://localhost/pay',
          }),
        ],
        [
          'PaymentReceipt',
          emailRender.PaymentReceipt({
            invoiceNumber: 'V-0001',
            amount: 100,
            currency: 'USD',
            paidAt: isoNow(),
            viewUrl: 'http://localhost/v',
          }),
        ],
        [
          'OverdueReminder',
          emailRender.OverdueReminder({
            invoiceNumber: 'V-0001',
            total: 100,
            currency: 'USD',
            dueDate: isoDays(-10),
            daysOverdue: 10,
            payUrl: 'http://localhost/p',
            reminderStep: 1,
          }),
        ],
      ] as const) {
        const html = await emailRender.renderToHtml(tpl)
        const text = await emailRender.renderToText(tpl)
        must(html.includes('V-0001'), `${name} html missing invoice number`)
        must(text.length > 0, `${name} text empty`)
        ev.push(`${name}: html ${html.length}b, text ${text.length}b`)
      }

      // 3. Resend webhook signature verification + email_log update
      const seeded = seed(db)
      const messageId = 'msg_verify_' + crypto.randomBytes(6).toString('hex')
      // pre-create email_log row referencing this messageId
      const elId = newId()
      db.prepare(
        `INSERT INTO email_log
           (id, invoice_id, to_email, template, resend_message_id, status, sent_at, created_at)
         VALUES (?, ?, 'recipient@verify.local', 'invoice_created', ?, 'sent', ?, ?)`,
      ).run(elId, seeded.invoiceId, messageId, isoNow(), isoNow())

      const Fastify = (await import('fastify')).default
      const { registerWebhookRoutes } = await import('../src/routes/webhookRoutes.js')
      const app = Fastify({ logger: false })
      await registerWebhookRoutes(app, db)
      await app.ready()

      const { Webhook } = await import('svix')
      const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
      const svixId = 'msg_' + crypto.randomBytes(8).toString('hex')
      const svixTs = Math.floor(Date.now() / 1000).toString()
      const body = JSON.stringify({
        type: 'email.delivered',
        created_at: isoNow(),
        data: { email_id: messageId },
      })
      const signature = wh.sign(svixId, new Date(Number(svixTs) * 1000), body)

      const resp = await app.inject({
        method: 'POST',
        url: '/api/webhooks/resend',
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTs,
          'svix-signature': signature,
          'content-type': 'application/json',
        },
        payload: Buffer.from(body, 'utf8'),
      })
      must(resp.statusCode === 200, `resend webhook ${resp.statusCode}: ${resp.body}`)
      const respBody = JSON.parse(resp.body)
      must(respBody.updated === 1, `expected 1 row updated, got ${respBody.updated}`)

      const updated = db
        .prepare(`SELECT status FROM email_log WHERE id=?`)
        .get(elId) as { status: string }
      must(updated.status === 'delivered', `email_log status ${updated.status}`)
      ev.push(`resend webhook: signature OK, email_log -> delivered`)

      // bad sig
      const bad = await app.inject({
        method: 'POST',
        url: '/api/webhooks/resend',
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTs,
          'svix-signature': 'v1,bogus',
          'content-type': 'application/json',
        },
        payload: Buffer.from(body, 'utf8'),
      })
      must(bad.statusCode === 400, `bad svix sig got ${bad.statusCode}`)
      ev.push('invalid svix signature rejected with 400')

      await app.close()
      return ev
    },
  )

  // ---- t1-recurring --------------------------------------------------------
  await run(
    't1-recurring',
    'schedule with past next_run_at generates new invoice with parent_invoice_id and advances next_run_at',
    async () => {
      const ev: string[] = []
      const seeded = seed(db)

      // Create a recurring schedule with next_run_at in the past
      const scheduleId = newId()
      const pastIso = new Date(Date.now() - 86_400_000).toISOString()
      db.prepare(
        `INSERT INTO recurring_schedules
           (id, user_id, template_invoice_id, frequency, interval_count,
            next_run_at, end_type, status, created_at, updated_at)
         VALUES (?, ?, ?, 'monthly', 1, ?, 'never', 'active', ?, ?)`,
      ).run(scheduleId, seeded.userId, seeded.invoiceId, pastIso, isoNow(), isoNow())

      const due = recurringScheduler.findDueSchedules(db)
      must(
        due.some((s) => s.id === scheduleId),
        `findDueSchedules did not include our schedule`,
      )
      ev.push(`findDueSchedules returned ${due.length} due schedule(s)`)

      // Run the actual handler
      handlers.clearHandlers()
      await import('../src/jobs/handlers/generateRecurring.js')
      enqueueJob(db, {
        type: 'recurring.generate',
        payload: { scheduleId },
      })
      const r = await tick(db)
      must(r.succeeded === 1, `recurring tick: ${JSON.stringify(r)}`)

      const newInv = db
        .prepare(
          `SELECT id, invoice_number, parent_invoice_id, status, currency
             FROM invoices WHERE parent_invoice_id = ?`,
        )
        .get(seeded.invoiceId) as
        | {
            id: string
            invoice_number: string
            parent_invoice_id: string
            status: string
            currency: string
          }
        | undefined
      must(newInv !== undefined, 'no child invoice generated')
      must(
        newInv!.parent_invoice_id === seeded.invoiceId,
        'parent_invoice_id mismatch',
      )
      must(newInv!.status === 'sent', `child invoice status ${newInv!.status}`)
      ev.push(
        `child invoice ${newInv!.invoice_number} created (parent=${seeded.invoiceId})`,
      )

      // schedule advanced
      const updated = db
        .prepare(
          `SELECT next_run_at, status FROM recurring_schedules WHERE id=?`,
        )
        .get(scheduleId) as { next_run_at: string; status: string }
      must(updated.status === 'active', `expected active, got ${updated.status}`)
      must(
        new Date(updated.next_run_at) > new Date(),
        `next_run_at not advanced: ${updated.next_run_at}`,
      )
      ev.push(`schedule advanced: next_run_at -> ${updated.next_run_at}`)

      // email.invoice job was enqueued for the child
      const queued = (
        db
          .prepare(
            `SELECT COUNT(*) as n FROM jobs WHERE type='email.invoice'
              AND payload_json LIKE ?`,
          )
          .get(`%${newInv!.id}%`) as { n: number }
      ).n
      must(queued >= 1, `expected email.invoice enqueued, got ${queued}`)
      ev.push('email.invoice job enqueued for child invoice')

      // verify cloneInvoice idempotent on its own (sanity)
      const { newInvoiceId, newInvoiceNumber } = cloneInvoice(db, seeded.invoiceId)
      must(newInvoiceId.length > 0, 'cloneInvoice failed')
      ev.push(`cloneInvoice direct call OK -> ${newInvoiceNumber}`)

      // audit row
      const audit = queryAudit(db, {
        entityType: 'recurring_schedule',
        entityId: scheduleId,
      })
      must(audit.length >= 1, `expected audit row for recurring, got ${audit.length}`)
      ev.push(`audit row recorded: ${audit[0]!.action}`)

      return ev
    },
  )

  // ---- t1-dunning ----------------------------------------------------------
  await run(
    't1-dunning',
    'overdue invoice + past due date enqueues email.overdue exactly once per step; uniqueness enforced',
    async () => {
      const ev: string[] = []
      const seeded = seed(db)

      // make this invoice overdue 8 days
      db.prepare(
        `UPDATE invoices SET due_date=?, status='sent' WHERE id=?`,
      ).run(isoDays(-8), seeded.invoiceId)

      // First sweep should enqueue step 1 (default policy: 7/14/30)
      const sweep1 = runDunningSweep(db, new Date())
      must(
        sweep1.remindersEnqueued === 1,
        `expected 1 reminder enqueued, got ${sweep1.remindersEnqueued}`,
      )
      ev.push(`sweep #1: scanned=${sweep1.invoicesScanned}, enqueued=${sweep1.remindersEnqueued}`)

      const hist1 = db
        .prepare(`SELECT reminder_step FROM dunning_history WHERE invoice_id=?`)
        .all(seeded.invoiceId) as Array<{ reminder_step: number }>
      must(hist1.length === 1, `expected 1 history row, got ${hist1.length}`)
      must(hist1[0]!.reminder_step === 1, `expected step 1, got ${hist1[0]!.reminder_step}`)
      ev.push(`dunning_history step 1 recorded`)

      // Second sweep at same time should NOT enqueue another reminder for step 1
      const sweep2 = runDunningSweep(db, new Date())
      must(
        sweep2.remindersEnqueued === 0,
        `expected 0 on second sweep, got ${sweep2.remindersEnqueued}`,
      )
      ev.push('idempotency: second sweep at same time did not re-enqueue step 1')

      // Advance to 14 days overdue, expect step 2
      db.prepare(`UPDATE invoices SET due_date=? WHERE id=?`).run(
        isoDays(-15),
        seeded.invoiceId,
      )
      const sweep3 = runDunningSweep(db, new Date())
      must(
        sweep3.remindersEnqueued === 1,
        `expected step 2 reminder, got ${sweep3.remindersEnqueued}`,
      )
      const hist2 = db
        .prepare(
          `SELECT reminder_step FROM dunning_history WHERE invoice_id=? ORDER BY reminder_step`,
        )
        .all(seeded.invoiceId) as Array<{ reminder_step: number }>
      must(hist2.length === 2, `expected 2 history rows, got ${hist2.length}`)
      must(hist2[1]!.reminder_step === 2, `expected step 2, got ${hist2[1]!.reminder_step}`)
      ev.push(`dunning_history step 2 recorded after advancing past 14 days`)

      // UNIQUE INDEX uniq_dunning_step enforced?
      let uniqueViolated = false
      try {
        db.prepare(
          `INSERT INTO dunning_history (id, invoice_id, reminder_step, sent_at) VALUES (?, ?, 1, ?)`,
        ).run(newId(), seeded.invoiceId, isoNow())
      } catch {
        uniqueViolated = true
      }
      must(uniqueViolated, 'UNIQUE constraint on (invoice_id, reminder_step) NOT enforced')
      ev.push('unique constraint on (invoice_id, reminder_step) is enforced')

      // verify email.overdue jobs enqueued
      const overdueJobs = (
        db
          .prepare(
            `SELECT COUNT(*) as n FROM jobs WHERE type='email.overdue'
              AND payload_json LIKE ?`,
          )
          .get(`%${seeded.invoiceId}%`) as { n: number }
      ).n
      must(overdueJobs === 2, `expected 2 email.overdue jobs, got ${overdueJobs}`)
      ev.push(`email.overdue jobs enqueued: ${overdueJobs} (one per reminder step)`)

      return ev
    },
  )

  // ---- summary -------------------------------------------------------------
  const passed = results.filter((r) => r.ok).length
  const total = results.length
  process.stdout.write('\n=== SUMMARY ===\n')
  for (const r of results) {
    process.stdout.write(`\n[${r.ok ? 'PASS' : 'FAIL'}] ${r.id}: ${r.description}\n`)
    for (const e of r.evidence) process.stdout.write(`  - ${e}\n`)
    if (!r.ok) process.stdout.write(`  ERROR: ${r.error}\n`)
  }
  process.stdout.write(`\n${passed}/${total} criteria passed\n`)

  db.close()
  process.exit(passed === total ? 0 : 1)
}

main().catch((err) => {
  process.stderr.write(`HARNESS CRASH: ${err.stack || err.message}\n`)
  process.exit(2)
})
