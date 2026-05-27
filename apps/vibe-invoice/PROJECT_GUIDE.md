# Invoice Automation SaaS — Project Guide

**Path:** `C:\dev\apps\invoice-automation-saas`
**Type:** Single-tenant invoice SaaS with recurring billing, automated dunning, and Stripe payments
**Stack:** Vite + React 19 SPA + Fastify v5 API + better-sqlite3
**Status:** Tier 1 (MVP parity ~Zoho Invoice) shipped 2026-05-03. See `docs/FEATURE-PARITY-PLAN.md` for the roadmap to Tier 2 (FreshBooks parity) and Tier 3 (mid-market).

---

## What this app does

Single-tenant invoicing for a freelancer or small business. Each user signs up, manages clients, creates invoices, sends them via email with PDF attached, accepts payment via Stripe Checkout, and gets automated overdue reminders.

Real features that work end-to-end today:

- Email/password signup + login with HS256 JWT cookie sessions, scrypt password hashing
- Client CRUD with ownership isolation
- Invoice create / edit (drafts only) / delete (drafts only) with line items, recurring config, tax, currency, notes/terms
- Public invoice view via `?token=` (no login required for the recipient)
- Stripe Checkout end-to-end: recipient clicks Pay → Stripe Checkout → signed webhook updates invoice
- Resend email delivery: invoice-created emails with PDF attached, payment receipts, overdue reminders
- Recurring invoices: configurable schedule (weekly/monthly/quarterly/yearly + interval), auto-clones the parent invoice and emails it
- Automated dunning: configurable per-user policy (default 7/14/30 days), one reminder per step per invoice, daily 9am sweep
- Manual payment recording (cash/check/other) with notes and audit trail
- Audit log for invoice paid, payment session created, recurring generation, dunning policy changes

Not yet built (see `docs/FEATURE-PARITY-PLAN.md`):

- Tier 2: expense tracking, time tracking, multi-currency with FX caching, tax tables, customizable invoice templates
- Tier 3: multi-tenant + organizations, role-based access, QuickBooks Online sync, outbound webhooks, client portal, reports & analytics

There is no OCR, no organizations table, no multi-instance support. Earlier versions of this guide claimed those — they did not exist.

---

## Architecture

### Frontend (`src/`)

- React 19 SPA built with Vite
- React Router for routing, react-hook-form for invoice form, react-toastify for notifications
- `@vibetech/ui` workspace package for shared components (Button, Card, Navigation)
- Sentry error tracking via `@sentry/react`

Pages (`src/pages/`):
- `Landing.tsx`, `Login.tsx`, `Signup.tsx` — public pages
- `Dashboard.tsx` — authenticated invoice list with error state on API failure
- `Clients.tsx` — client CRUD
- `CreateInvoice.tsx` — create or edit (when `?edit=<id>`) draft invoices
- `InvoicePayment.tsx` — public recipient view + Stripe Pay button

Services (`src/services/`):
- `invoiceService.ts` — invoice CRUD, listener model with `{invoices, error}` state, propagates errors instead of returning fake data
- `stripeService.ts` — `loadStripe` for Stripe.js + `createCheckoutSession` (POSTs to server)
- `sentry.ts` — Sentry init

### Backend (`server/`)

- Fastify v5 with cookie sessions, CORS, rate limiting (`@fastify/rate-limit`)
- better-sqlite3 with WAL mode + foreign keys ON, file at `D:\databases\invoiceflow.db` (env: `DATABASE_PATH`)
- Versioned SQL migrations at `server/src/migrations/NNNN_*.sql`, applied at startup
- In-process job runner (`node-cron` + `jobs` table) with retries + idempotency
- TypeScript strict mode, NodeNext modules, `.js` extensions on imports

Layout:
```
server/src/
  index.ts                  # Fastify boot, route registration, runner+cron lifecycle, graceful shutdown
  db.ts                     # openDb() — D:\ guard, WAL pragma
  auth.ts                   # JWT cookie session + scrypt password
  audit.ts                  # recordAudit() / queryAudit()
  events.ts                 # in-process EventEmitter for SSE
  migrate.ts                # thin wrapper around runMigrations(migrationsDir)
  migrations/               # numbered SQL files + index.ts (runner)
    0001_initial.sql        # users, clients, invoices, invoice_items
    0002_audit_log.sql
    0003_jobs.sql
    0004_payments.sql       # payments + stripe_events
    0005_email_log.sql
    0006_recurring.sql      # recurring_schedules
    0007_dunning.sql        # dunning_policies + dunning_history
    index.ts                # transactional, lexical-order, idempotent
  clients/                  # SDK wrappers (lazy + fail-fast on missing env)
    stripe.ts               # getStripe()
    resend.ts               # getResend()
    fx.ts                   # fetchExchangeRate() via Frankfurter (no SDK)
  jobs/
    runner.ts               # tick() + startJobRunner() with poll/lock/backoff
    enqueue.ts              # enqueueJob()
    cron.ts                 # registerCronSchedule() / startCronSchedules()
    handlers/
      index.ts              # handler registry
      emailInvoice.ts       # 'email.invoice'
      emailReceipt.ts       # 'email.receipt'
      emailOverdue.ts       # 'email.overdue'
      generateRecurring.ts  # 'recurring.generate'
      dunningSweep.ts       # 'dunning.sweep'
  payments/
    stripeAdapter.ts        # buildCheckoutSession + verifyWebhookSignature
  email/
    render.ts               # @react-email/render wrappers
    send.ts                 # sendInvoiceCreated/Receipt/Overdue with PDF attach
    templates/              # InvoiceCreated, PaymentReceipt, OverdueReminder
  pdf/
    InvoicePdfDocument.tsx  # @react-pdf/renderer Document
    render.ts               # renderInvoicePdfBuffer()
  recurring/
    generator.ts            # cloneInvoice(), generateNextInvoiceNumber()
    scheduler.ts            # advanceDate(), findDueSchedules(), computeAdvancement()
    cronRegistration.ts     # hourly sweep
  dunning/
    policy.ts               # getPolicy/upsertPolicy + DEFAULT_REMINDERS
    sweep.ts                # runDunningSweep()
    cronRegistration.ts     # daily 9am
  routes/
    authRoutes.ts           # /api/auth/{me,signup,login,logout,profile}
    clientRoutes.ts         # /api/clients CRUD
    invoiceRoutes.ts        # /api/invoices GET/POST/PUT/DELETE + status PATCH + resend POST
    publicRoutes.ts         # /api/public/invoices/:id GET + record-manual-payment POST
    paymentRoutes.ts        # /api/public/invoices/:id/checkout-session
    webhookRoutes.ts        # /api/webhooks/stripe + /api/webhooks/resend (raw body, signed)
    recurringRoutes.ts      # /api/recurring CRUD
    dunningRoutes.ts        # /api/dunning/policy GET/PUT
  security/
    rateLimit.ts            # global 100/min, /api/auth/{login,signup} 5/min
```

---

## Run it

### Dev (two processes)

```powershell
# In one shell - Vite SPA on http://localhost:5173
pnpm --filter invoice-automation-saas dev

# In another shell - Fastify API on http://localhost:8787
pnpm --filter invoice-automation-saas dev:api
```

Vite proxies `/api` to `:8787` (see `vite.config.ts`).

### Quality gates (must pass before commit)

```powershell
pnpm --filter invoice-automation-saas typecheck
pnpm --filter invoice-automation-saas lint
pnpm --filter invoice-automation-saas test -- --run
pnpm exec tsc -p apps/invoice-automation-saas/server/tsconfig.json --noEmit
```

The test suite (98 tests at Tier 1 ship) includes the migration runner, audit log, jobs runner, rate limiter, Stripe webhook signature flow, recurring scheduler/generator, and dunning sweep.

### Production build

```powershell
pnpm --filter invoice-automation-saas build      # SPA -> dist/
pnpm --filter invoice-automation-saas build:api  # server -> server/dist/
pnpm --filter invoice-automation-saas start:api  # node server/dist/index.js
```

Set `SERVE_WEB=1` to have the API also serve the SPA from `dist/` (single-process deploy).

---

## Environment variables

Per `.claude/rules/database-storage.md` and `.claude/rules/paths-policy.md`: code lives on `C:\dev`, all data on `D:\`. Never hardcode paths.

| Var | Required | Purpose |
|-----|---|---|
| `DATABASE_PATH` | yes (default `D:\databases\invoiceflow.db`) | SQLite location, must be on `D:\` |
| `PORT` | optional (default 8787) | Fastify port |
| `HOST` | optional (default 127.0.0.1) | Fastify bind |
| `TRUST_PROXY` | optional | Set to `1` behind a reverse proxy |
| `SERVE_WEB` | optional | Set to `1` to serve SPA from API |
| `WEB_DIST_DIR` | optional | Override SPA dist path (default `<cwd>/dist`) |
| `STRIPE_SECRET_KEY` | yes for payments | Server-side Stripe SDK key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | yes for payments | `/api/webhooks/stripe` signature verification (`whsec_...`) |
| `APP_BASE_URL` | yes for payments+email | Used for Stripe success/cancel redirects and email pay links (e.g. `https://invoices.example.com`) |
| `RESEND_API_KEY` | yes for email | Server-side Resend SDK key (`re_...`) |
| `RESEND_WEBHOOK_SECRET` | yes for delivery tracking | `/api/webhooks/resend` Svix-style HMAC (`whsec_...`) |
| `EMAIL_FROM` | yes for email | Verified Resend sender address |
| `VITE_API_BASE_URL` | optional | Frontend API base (blank = same origin) |
| `VITE_STRIPE_PUBLIC_KEY` | optional | Frontend Stripe.js publishable key (`pk_...`) — only needed if you embed Stripe Elements directly; the current Checkout-redirect flow does not |

The env getters (`server/src/clients/{stripe,resend}.ts`) throw on first call with a clear "X is not set" message, so missing config fails fast at startup if a payment or email path is exercised.

---

## How payments flow end-to-end

1. Recipient opens public invoice link `https://app.example.com/invoice/<id>?token=<public_token>`
2. They click Pay with Stripe → frontend POSTs `{token}` to `/api/public/invoices/:id/checkout-session`
3. Server validates token + status, calls `buildCheckoutSession` (Stripe Adapter), returns `{url}`
4. Frontend redirects browser to `url` (Stripe's hosted Checkout)
5. Recipient completes payment → Stripe redirects to `${APP_BASE_URL}/pay/<id>?token=<token>&status=success`
6. Stripe POSTs `checkout.session.completed` to `/api/webhooks/stripe`
7. Server verifies signature with `STRIPE_WEBHOOK_SECRET`, dedupes via `stripe_events` PRIMARY KEY (so retries are no-ops), in a transaction: inserts `payments` row, sets invoice `status='paid'`, writes `audit_log`, emits SSE
8. Server enqueues `email.receipt` job → background runner fetches it within 10 seconds → `sendPaymentReceipt` builds the React Email template and dispatches via Resend → writes `email_log` row
9. Recipient receives a thanks-for-payment email
10. When Resend's webhook later fires `email.delivered`/`email.bounced`, `/api/webhooks/resend` updates `email_log.status` keyed on `resend_message_id`

Replays of the same Stripe event are no-ops at step 7 — the `INSERT OR IGNORE` into `stripe_events` returns 0 changes and the handler short-circuits with `{duplicate: true}`.

---

## How recurring invoices flow

1. User creates an invoice with `body.recurring.enabled = true`, `frequency: 'monthly'`, `interval: 1`, optional `endDate` or `occurrences`
2. POST `/api/invoices` creates the invoice + a `recurring_schedules` row with `next_run_at = now + frequency*interval`
3. Hourly cron (`recurring/cronRegistration.ts`, `0 * * * *`) calls `findDueSchedules`, enqueues `recurring.generate` jobs
4. Job handler (`jobs/handlers/generateRecurring.ts`) calls `cloneInvoice` (transaction: clones invoice + line items, increments invoice number), calls `computeAdvancement` to advance `next_run_at` (or end if occurrences exhausted / end_date past), records audit, enqueues `email.invoice` job for the new invoice
5. Email goes out the same way as a manual invoice send

User can manage schedules via:
- `GET /api/recurring`
- `PATCH /api/recurring/:id` (status, next_run_at, frequency, etc.)
- `DELETE /api/recurring/:id` (sets status='ended')

---

## How dunning flows

1. User configures policy via `PUT /api/dunning/policy` with `{enabled, reminders: [{daysAfterDue}]}`. Default if no row: enabled, reminders at 7/14/30 days
2. Daily 9am cron (`dunning/cronRegistration.ts`) enqueues `dunning.sweep` job
3. Sweep handler iterates `sent` invoices with `due_date < now`. For each, looks up policy. Computes `daysOverdue`. Finds the first reminder step `i` where `daysAfterDue <= daysOverdue` AND no `dunning_history` row exists for `(invoice_id, i+1)`. INSERT OR IGNORE into `dunning_history` (the unique constraint guarantees idempotency under concurrent sweeps), then enqueues `email.overdue` job
4. `email.overdue` handler dispatches the `OverdueReminder` template (tone escalates with `reminderStep`) via Resend, writes `email_log`

---

## Migrations

Add a new migration:

1. Create `server/src/migrations/NNNN_short_name.sql` — must match `^\d{4}_[a-z0-9_-]+\.sql$`
2. Use `IF NOT EXISTS` guards on table/index creation; idempotent semantics let the runner re-apply safely if interrupted
3. For ALTER TABLE, write the migration plain (it WILL run exactly once thanks to `schema_migrations`)
4. Restart the server (or call `migrate(db)` manually); migrations apply in lexical order, each in its own transaction. Rollback is automatic on failure.

Verify with `select * from schema_migrations` — every migration filename without `.sql` is a row.

---

## Jobs

Enqueue from anywhere: `enqueueJob(db, { type: 'my.handler', payload: {...}, runAt?: Date, maxAttempts?: 5 })`.

Register handlers at startup (import the file from `server/src/index.ts` for side effects):

```ts
import { registerHandler } from './jobs/handlers/index.js'

registerHandler<MyPayload>('my.handler', async (payload, ctx) => {
  await doWork(payload)
  // throw to retry; runner uses 2^attempts minute backoff, capped at 1h
})
```

Schedule a cron at module-load time:

```ts
import { registerCronSchedule } from './jobs/cron.js'

registerCronSchedule({
  name: 'unique-name',
  expression: '0 9 * * *',  // node-cron syntax
  task: () => { /* enqueue jobs, do not do work directly */ },
})
```

The runner polls every 10s, claims up to 5 jobs at a time, marks them `running` with a 5-minute lock. If a worker crashes mid-run, the lock expires after 5 minutes and another worker reclaims the job (idempotency is the handler's responsibility — see Stripe webhook handler for the pattern).

---

## Constraints (don't violate)

- No mocks/placeholders in production code (`.claude/rules/no-mock-or-placeholder-code.md`). Tests are fine.
- All data on `D:\`, code on `C:\dev` (`.claude/rules/paths-policy.md`).
- Never hardcode `D:\databases\...` — use `process.env.DATABASE_PATH`.
- ASCII only in source-file comments (pre-commit hook enforces).
- TypeScript strict mode, NodeNext modules, `.js` import extensions.
- `pnpm --filter invoice-automation-saas <cmd>` from repo root — never bare `pnpm install` in app dir.
- Migrations are append-only; never modify or delete an existing numbered file.

---

## Future work (see `docs/FEATURE-PARITY-PLAN.md`)

- Tier 2 (~3-4 weeks): expense tracking, time tracking with billable hours, multi-currency with `exchange_rates` table cache, per-region tax tables, customizable invoice templates
- Tier 3 (~5-7 weeks): multi-tenant migration (`org_id` everywhere, role-based access), QuickBooks Online OAuth + invoice sync, outbound webhooks, client portal upgrade, reports & analytics dashboard, optional Postgres swap if SQLite write contention becomes measurable
