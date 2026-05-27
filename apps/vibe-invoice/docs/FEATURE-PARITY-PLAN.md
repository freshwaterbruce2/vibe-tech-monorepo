<!-- Generated 2026-05-03 by Plan agent. See active project lock criteria for tracked progress. -->

The advisor surfaced critical points that significantly sharpen the plan:
1. `migrate.ts` is a stub (re-runs schema.sql with IF NOT EXISTS) — versioned migrations are step 0
2. `mockApi.ts` is wired into production fallback — violates `no-mock-or-placeholder-code.md`
3. `recurring_json`/`parent_invoice_id` columns exist but nothing reads them
4. The "pay" route is just a status flip, not real payment
5. PROJECT_GUIDE.md is "documentation cosplay" describing a wholly different app
6. In-memory EventEmitter doesn't survive multi-instance
7. No rate limiting / no CSRF on a cookie-auth signup endpoint

Now I'll produce the final comprehensive plan as my assistant message.

---

# InvoiceFlow Feature-Parity Plan

**Target**: Bring `apps/invoice-automation-saas` to feature parity with FreshBooks, Zoho Invoice, Wave, Bonsai (Tier 1-2), and mid-market alternatives like QuickBooks (Tier 3).
**Constraint**: Keep current stack — Vite + React 19 SPA, Fastify v5 + better-sqlite3 server. Windows-only monorepo, all data on `D:\`, no hardcoded paths in source. Every shipped piece must be real and complete (per `.claude/rules/no-mock-or-placeholder-code.md`).
**Last verified**: 2026-05-03 against working tree.

---

## 1. Verified ground truth (what really exists today)

After reading every file in `server/src`, `src/services`, `src/pages`, `src/components`, `src/types`, the schema, and the package manifests:

| Area | Reality | Notes |
|---|---|---|
| **Auth** | Cookie-session via custom HS256 JWT in `server/src/auth.ts`. scrypt password hashing. `users` table is single-tenant — no `org_id` anywhere. Routes: `/api/auth/{me,signup,login,logout,profile}`. | Real. Solid. No rate limit, no CSRF token, no email verification. |
| **Clients** | Full CRUD with ownership checks at `server/src/routes/clientRoutes.ts`. Block-delete when invoices reference. | Real and complete. |
| **Invoices** | List/get/create + status patch at `server/src/routes/invoiceRoutes.ts`. Auto-creates client on invoice create. Generates `public_token` per invoice. | Real. No update of line-items after create, no delete. |
| **Public invoice view** | `GET /api/public/invoices/:id?token=…` and `POST .../pay`. `pay` just flips status to `'paid'`. | The "pay" endpoint is a placeholder, not a real payment flow. |
| **Stripe** | Client-side `loadStripe` only (`src/services/stripeService.ts`). `PaymentForm.tsx` literally renders a button labelled *"Mark as paid (local simulation)"* and the help text says *"When you add a backend, replace this with a real Stripe Checkout session."* | **No server-side Stripe at all.** No checkout sessions, no webhook, no payment intents. |
| **Email** | None. No SMTP, no Resend, no template engine. | Zero email infrastructure. |
| **Recurring** | Schema has `recurring_json` and `parent_invoice_id` columns. `src/services/recurringService.ts` exposes `computeNextInvoiceDate`. `RecurringSettings.tsx` UI lets users toggle it. **Nothing reads `recurring_json` server-side. No scheduler. No cron.** | Write-only feature. UI lies to users. |
| **PDF** | Client-side via `jspdf` in `src/utils/generateInvoicePdf.ts`. Triggered from Dashboard "download" button. | Real but client-only. Cannot attach to emails. |
| **Real-time** | SSE at `GET /api/events`, in-process `EventEmitter` (`server/src/events.ts`). | Real for single-process. Will break in multi-instance. |
| **Migrations** | `server/src/migrate.ts` is a **9-line stub** that just `db.exec(schema.sql)`. All `CREATE TABLE` use `IF NOT EXISTS`. **There is no migration versioning, no `ALTER TABLE` mechanism, no rollback.** | Hard blocker for Tier 1. |
| **mockApi.ts** | `src/services/mockApi.ts` returns hard-coded invoices, and is **wired into the production code path** in `invoiceService.ts` (catch block, line ~104) as a fallback when API fetches fail. | Violates `no-mock-or-placeholder-code.md`. Must be removed in Tier 0. |
| **Multi-tenant** | None. `PROJECT_GUIDE.md` claims `organizations`, `roles`, `audit_log`, OCR — none of which exists. The doc is misleading and describes a wholly different app. | `PROJECT_GUIDE.md` and `CLAUDE.md` need rewriting in Tier 0. |
| **Rate limiting / CSRF** | Neither present. Cookie-based auth + open signup endpoint = abuse vector. | Add in Tier 0. |
| **Audit log** | None. | Add in Tier 1 (not Tier 3) — cheap, immediately useful for Stripe webhook forensics. |
| **Webhooks** | Inbound: none. Outbound: none. | Tier 1 inbound (Stripe). Tier 3 outbound. |
| **Sentry** | `@sentry/react` installed; `src/services/sentry.ts` exists. | Client-only. Server has no error reporting. |

**Net**: the app is a clean single-tenant invoice CRUD app with a fake payment button and dead recurring code. Solid foundation; not a SaaS in the meaningful sense yet.

---

## 2. Architectural decisions (locked, not litigated)

These are decided up front so every feature plan downstream is consistent. Each decision lists rationale and the alternative explicitly rejected.

| # | Decision | Rationale | Rejected alt |
|---|---|---|---|
| D1 | **Versioned SQL migrations**: numbered files `server/src/migrations/0001_*.sql`, applied in order, tracked in `schema_migrations(version, applied_at)`. Hand-written, idempotent guards inside each migration. | The current `IF NOT EXISTS`-only stub cannot do `ALTER TABLE`. Versioning is non-negotiable for adding columns. | An ORM (drizzle/kysely) — too much retrofit; postpone to Tier 3 if SQL strain becomes real. |
| D2 | **Job runner**: `node-cron` for time-based ticks + a `jobs` table for retries/idempotency, executed by an in-process worker started alongside Fastify. Jobs interface (`enqueue/dequeue/handle`) abstracted so Tier 3 can swap in BullMQ without touching feature code. | App is single-instance SQLite. Pulling in Redis just to run cron is overkill. | BullMQ + Redis (deferred to a *conditional* Tier 3 item). |
| D3 | **Email**: Resend SDK (`resend` npm) + `react-email` + `@react-email/render` to compose templates as React components. | Idiomatic for React 19; Resend integrates cleanly; already chosen by user. | Raw HTML strings (rejected — unmaintainable, no preview tooling). |
| D4 | **PDF**: switch to `@react-pdf/renderer` for **both** server-side (email attachment) and client-side download. One component, two render targets. The legacy `jspdf` path stays usable until the new path ships, then gets removed in Tier 1. | Avoids divergence between the PDF a client downloads and the PDF emailed to them. | Keep `jspdf` for client + Puppeteer/Playwright for server (rejected — Puppeteer adds 200MB Chromium dep on every install). |
| D5 | **Multi-tenant model**: a single big migration at the **start of Tier 3** (before any Tier 3 feature) that adds `organizations`, adds `org_id` to every tenant-scoped row, backfills one personal org per user, and shifts UNIQUE constraints from `(user_id, …)` to `(org_id, …)`. | Trying to retrofit org_id incrementally per feature is a nightmare. Big-bang once is mechanical and reviewable. | Per-feature retrofit (rejected). |
| D6 | **Session for multi-tenant**: extend the JWT cookie with a `current_org_id` claim + add `POST /api/auth/switch-org` to re-issue the cookie. No server-side session store. | Stateless, simple, matches existing pattern. | DB-backed sessions (deferred — only needed if we later require token revocation). |
| D7 | **Stay on SQLite for Tier 1-2.** Design schema Postgres-portable (no SQLite-isms; ISO timestamps as TEXT, no `JSON` reliance for hot paths). Postgres migration flagged as **conditional** Tier 3 item, triggered by measured write contention. | SQLite + WAL handles >>10k invoices/day on local hardware. | Mandatory Postgres swap in Tier 3 (rejected — premature). |
| D8 | **Audit log in Tier 1, not Tier 3.** Schema lands now; broad event coverage and UI come in Tier 3. | Stripe webhooks need forensics from day one (you'll get duplicate events, replay attacks). | Defer to Tier 3 (rejected — too risky without it during webhook implementation). |
| D9 | **Idempotency for inbound webhooks**: `stripe_events(event_id PRIMARY KEY, …)` upsert-or-skip on every event. | Stripe retries webhooks aggressively. Without this, payments get double-recorded. | None — this is table stakes. |
| D10 | **Frankfurter API for FX**, cached in `exchange_rates(base, quote, date, rate)` with TTL refresh. | Free, no key, ECB-backed daily rates. | Open Exchange Rates (paid above 1k req/mo). |

---

## 3. Tier 0 — Foundations (must ship before Tier 1 features)

These are cross-cutting prerequisites. Not optional. Estimated **5-7 days** of focused work.

### T0.1 — Versioned migration system (S)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0001_initial.sql` — copy of current `schema.sql`, idempotent guards intact
- `apps/invoice-automation-saas/server/src/migrations/index.ts` — runner

**Files modify:**
- `apps/invoice-automation-saas/server/src/migrate.ts` — replace stub
- `apps/invoice-automation-saas/server/src/index.ts` — call new `migrate()`
- `apps/invoice-automation-saas/server/src/schema.sql` — **delete** (replaced by numbered migrations)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```
Runner reads `migrations/*.sql` in lexical order, wraps each in a transaction, records `version` on success.

**Acceptance**: User can add `0002_xxx.sql`, restart server, see migration applied exactly once. `select * from schema_migrations` shows both versions.

---

### T0.2 — Remove `mockApi.ts` and the production fallback (S)

**Files modify:**
- `apps/invoice-automation-saas/src/services/invoiceService.ts` — delete the `catch` branch that calls `generateMockInvoices()`. On API failure, propagate the error to the listener; the UI shows an empty/error state.
- `apps/invoice-automation-saas/src/test/services/` — keep mock helpers test-side only.

**Files delete:**
- `apps/invoice-automation-saas/src/services/mockApi.ts`

**Acceptance**: With the API server stopped, the dashboard shows an explicit "could not load invoices" state — never fake data. `grep -r mockApi src/` returns zero hits outside `*.test.*`.

---

### T0.3 — Background job runner + jobs table (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0002_jobs.sql`
- `apps/invoice-automation-saas/server/src/jobs/runner.ts` — polls + dispatches
- `apps/invoice-automation-saas/server/src/jobs/handlers/index.ts` — registry
- `apps/invoice-automation-saas/server/src/jobs/cron.ts` — `node-cron` schedules that enqueue jobs

**Files modify:**
- `apps/invoice-automation-saas/server/src/index.ts` — start runner

**New deps**: `node-cron` (latest stable at impl time)

**Schema (DDL):**
```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  run_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|running|done|failed
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_due ON jobs(status, run_at);
```

Worker loop: every 10s, claim up to N pending jobs whose `run_at <= now`, set `locked_until = now + 5min`, dispatch to handler, on success set `status='done'`, on throw increment `attempts`, exponential backoff `run_at = now + 2^attempts minutes`, fail when `attempts >= max_attempts`.

**Acceptance**: Enqueue a test job → it runs once. Throw inside handler → it retries, eventually fails. Two server restarts mid-run don't double-execute (lock + idempotent handler).

---

### T0.4 — Outbound HTTP client wrappers (S)

**Files create:**
- `apps/invoice-automation-saas/server/src/clients/stripe.ts` — wraps `stripe` SDK; reads `STRIPE_SECRET_KEY` env; throws on missing.
- `apps/invoice-automation-saas/server/src/clients/resend.ts` — wraps `resend` SDK; reads `RESEND_API_KEY`.
- `apps/invoice-automation-saas/server/src/clients/fx.ts` — Frankfurter wrapper (used in Tier 2).

Each exports a singleton getter, lazily initialised. Eases test mocking (one swap point) and makes startup fail-fast when env is missing in production.

**New deps**: `stripe` server SDK, `resend`.

**Acceptance**: Importing `getStripe()` without `STRIPE_SECRET_KEY` set throws a clear error at first call. Tests can replace these via Vitest `vi.mock`.

---

### T0.5 — Rate limiting + basic CSRF posture (S)

**Files create:**
- `apps/invoice-automation-saas/server/src/security/rateLimit.ts`

**Files modify:**
- `apps/invoice-automation-saas/server/src/index.ts` — register `@fastify/rate-limit` globally with stricter limits on `/api/auth/*` (5/min/IP for signup+login).

CSRF: keep cookie auth, but add a `SameSite=Strict` option for the cookie (currently `lax`) once the SPA and API share a host in production. For the dev split (Vite 5173 + Fastify 8787) keep `lax` and document the prod-only flip.

**New deps**: `@fastify/rate-limit`.

**Acceptance**: 6th login attempt within a minute returns 429.

---

### T0.6 — React Email + @react-pdf/renderer setup (S)

**Files create:**
- `apps/invoice-automation-saas/server/src/email/templates/InvoiceCreated.tsx`
- `apps/invoice-automation-saas/server/src/email/templates/PaymentReceipt.tsx`
- `apps/invoice-automation-saas/server/src/email/templates/OverdueReminder.tsx`
- `apps/invoice-automation-saas/server/src/email/render.ts` — `renderToHtml(template, props)`
- `apps/invoice-automation-saas/server/src/pdf/InvoicePdfDocument.tsx` — `@react-pdf/renderer` Document
- `apps/invoice-automation-saas/server/src/pdf/render.ts` — `renderInvoicePdfBuffer(invoice): Promise<Buffer>`

**New deps**: `react-email`, `@react-email/components`, `@react-email/render`, `@react-pdf/renderer`.

**Acceptance**: `pnpm test` includes a test that renders each template + the PDF, asserts non-empty HTML/buffer.

---

### T0.7 — Audit log table (S)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0003_audit_log.sql`
- `apps/invoice-automation-saas/server/src/audit.ts` — `recordAudit(db, { actorUserId, action, entityType, entityId, metadata })`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id, created_at);
```

Used by Tier 1 webhook handler immediately. UI (filtering, search) lands in Tier 3.

---

### T0.8 — Rewrite stale documentation (S)

**Files modify:**
- `apps/invoice-automation-saas/PROJECT_GUIDE.md` — full rewrite to match reality (current schema, no OCR, no orgs, no Express)
- `apps/invoice-automation-saas/CLAUDE.md` — already mostly accurate; add note that `migrate.ts` is now versioned, mention Resend + Stripe envs.

**Acceptance**: `PROJECT_GUIDE.md` no longer references Express, Tesseract, organizations, or any non-existent script.

---

### Tier 0 dependency graph
```
T0.1 (migrations) ──┬──> T0.3 (jobs table)
                    └──> T0.7 (audit table)
T0.2 (mockApi)      independent
T0.4 (clients)      depends on env vars existing
T0.5 (rate limit)   independent
T0.6 (email/pdf)    depends on T0.4 (resend client)
T0.8 (docs)         do last
```

---

## 4. Tier 1 — MVP parity (~Zoho Invoice level), 1-2 weeks

Goal: real payments, real emails, real recurring, real dunning. Every feature ends-to-end functional, no stubs.

### T1.1 — Server-side Stripe Checkout + webhook (L)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0004_payments.sql`
- `apps/invoice-automation-saas/server/src/routes/paymentRoutes.ts`
- `apps/invoice-automation-saas/server/src/routes/webhookRoutes.ts`
- `apps/invoice-automation-saas/server/src/payments/stripeAdapter.ts` — create checkout session, verify signatures, parse events

**Files modify:**
- `apps/invoice-automation-saas/server/src/index.ts` — register routes; `webhookRoutes` must use **raw body parser** (Stripe signature verification needs the unmodified bytes)
- `apps/invoice-automation-saas/src/components/invoice/PaymentForm.tsx` — replace "mark as paid (local simulation)" with a real Checkout redirect. Remove the apologetic copy.
- `apps/invoice-automation-saas/src/services/stripeService.ts` — add `createCheckoutSession(invoiceId, publicToken)` that POSTs to the new route and returns the redirect URL.
- `apps/invoice-automation-saas/server/src/routes/publicRoutes.ts` — keep `POST /api/public/invoices/:id/pay` but rename/repurpose as `POST /api/public/invoices/:id/record-manual-payment` for cash/check tracking; require notes + method enum.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL, -- 'stripe'|'manual_cash'|'manual_check'|'manual_other'
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  external_fee REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  processed_at TEXT NOT NULL
);
```

**API:**
| Method | Path | Contract |
|---|---|---|
| POST | `/api/public/invoices/:id/checkout-session` | Body: `{ token }`. Returns `{ url }`. Server creates Stripe Checkout Session with `line_items`, `metadata.invoice_id`, success/cancel URLs. |
| POST | `/api/webhooks/stripe` | Stripe-signed. Verify signature, dedupe via `stripe_events`, on `checkout.session.completed` create a `payments` row, set invoice `status='paid'`, write audit log, emit SSE. |

**Acceptance**: User opens public invoice link → clicks Pay → redirected to Stripe Checkout → completes test payment → webhook fires → invoice flips to paid in DB → SSE notifies dashboard → audit log records the event with the Stripe event id. Replaying the same Stripe event is a no-op.

**Effort**: L. **Depends on**: T0.1, T0.4, T0.7.

---

### T1.2 — Resend transactional emails (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/email/send.ts` — `sendInvoiceCreated`, `sendPaymentReceipt`, `sendOverdueReminder` — each builds template, attaches PDF buffer (T0.6), calls Resend, on failure throws to retry via job system
- `apps/invoice-automation-saas/server/src/jobs/handlers/emailInvoice.ts`
- `apps/invoice-automation-saas/server/src/jobs/handlers/emailReceipt.ts`
- `apps/invoice-automation-saas/server/src/migrations/0005_email_log.sql`

**Files modify:**
- `apps/invoice-automation-saas/server/src/routes/invoiceRoutes.ts` — on create with `status='sent'`, enqueue `email-invoice` job (don't block the request).
- `apps/invoice-automation-saas/server/src/routes/webhookRoutes.ts` — on payment success, enqueue `email-receipt` job.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  resend_message_id TEXT,
  status TEXT NOT NULL, -- queued|sent|delivered|bounced|failed
  error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_log_invoice ON email_log(invoice_id);
```

**API:**
| Method | Path | Contract |
|---|---|---|
| POST | `/api/webhooks/resend` | Resend-signed. Update `email_log.status` from `email.delivered` / `email.bounced` events. |
| POST | `/api/invoices/:id/resend` | Auth. Enqueue another send. Returns `{ jobId }`. |

**Env**: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM` (e.g., `invoices@yourdomain.com`), `APP_BASE_URL`.

**Acceptance**: Create invoice → recipient receives email with PDF attached and "Pay now" link → clicks link → completes Stripe payment → receives receipt email. `email_log` shows `delivered` status after Resend webhook fires.

**Effort**: M. **Depends on**: T0.3, T0.4, T0.6, T1.1.

---

### T1.3 — Recurring invoice generation (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0006_recurring.sql`
- `apps/invoice-automation-saas/server/src/jobs/handlers/generateRecurring.ts`
- `apps/invoice-automation-saas/server/src/recurring/generator.ts` — clones a parent invoice, increments `invoice_number`, sets new `issue_date`/`due_date`, persists, enqueues email
- `apps/invoice-automation-saas/server/src/recurring/scheduler.ts` — cron handler: every hour, find recurring schedules with `next_run_at <= now`, enqueue generation jobs

**Files modify:**
- `apps/invoice-automation-saas/server/src/routes/invoiceRoutes.ts` — when create body has `recurring`, write `recurring_schedules` row instead of stuffing into `recurring_json` (keep the column for backward read until backfill migration).
- `apps/invoice-automation-saas/src/components/invoice/RecurringSettings.tsx` — surface "Next invoice will be sent on …" derived from `next_run_at`.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_invoice_id TEXT NOT NULL, -- the original invoice acting as template
  frequency TEXT NOT NULL, -- weekly|monthly|quarterly|yearly
  interval_count INTEGER NOT NULL DEFAULT 1,
  next_run_at TEXT NOT NULL,
  end_type TEXT NOT NULL DEFAULT 'never', -- never|date|occurrences
  end_date TEXT,
  occurrences_remaining INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- active|paused|ended
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(template_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_schedules(status, next_run_at);
```

Backfill migration `0007`: read existing `invoices.recurring_json`, create `recurring_schedules` rows for any with `enabled=true`.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/recurring` | Auth. List schedules for user. |
| PATCH | `/api/recurring/:id` | Auth. `{ status?, next_run_at?, frequency?, interval_count? }`. |
| DELETE | `/api/recurring/:id` | Auth. Sets `status='ended'`. |

**Acceptance**: Create monthly recurring invoice → 1 month later (or after manually setting `next_run_at` to past for a test) the cron fires → new invoice exists with `parent_invoice_id` set → email sent → `next_run_at` advanced. `RecurringInvoices.tsx` widget shows accurate "next" date pulled from server, not from stale form state.

**Effort**: M. **Depends on**: T0.3, T1.2.

---

### T1.4 — Automated dunning (overdue reminders) (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0008_dunning.sql`
- `apps/invoice-automation-saas/server/src/jobs/handlers/dunningSweep.ts`
- `apps/invoice-automation-saas/server/src/dunning/policy.ts` — per-user configurable rules

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS dunning_policies (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  reminders_json TEXT NOT NULL, -- e.g. [{"daysAfterDue":7,"template":"firstReminder"},{"daysAfterDue":14,...},{"daysAfterDue":30,...}]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dunning_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  reminder_index INTEGER NOT NULL, -- which step (0,1,2,...)
  email_log_id TEXT,
  sent_at TEXT NOT NULL,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dunning_step ON dunning_history(invoice_id, reminder_index);
```

Cron: daily at 09:00 server time, iterate sent invoices where `due_date < now AND status != 'paid'`, compute days overdue, find first matching policy step that hasn't been sent (uniqueness via `dunning_history`), enqueue email.

**Files modify:**
- `apps/invoice-automation-saas/src/pages/Dashboard.tsx` — add a "Settings" panel or new `/settings/dunning` page exposing reminder configuration.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/dunning/policy` | Auth. Returns user policy. |
| PUT | `/api/dunning/policy` | Auth. `{ enabled, reminders }`. |

**Acceptance**: Create a sent invoice with `due_date = today - 8 days` → next dunning sweep enqueues `email-overdue` → email sent → `dunning_history` records step 0 → next sweep won't re-send step 0 → after `due_date < now - 14d` step 1 fires.

**Effort**: M. **Depends on**: T0.3, T1.2.

---

### T1.5 — Invoice update/delete + line-item edit (S)

Plug a real gap: today you can create an invoice but never edit its line items, only flip status.

**Files modify:**
- `apps/invoice-automation-saas/server/src/routes/invoiceRoutes.ts` — add `PUT /api/invoices/:id` and `DELETE /api/invoices/:id` (only allowed when `status='draft'`).
- `apps/invoice-automation-saas/src/services/invoiceService.ts` — add corresponding methods.
- `apps/invoice-automation-saas/src/pages/CreateInvoice.tsx` — accept `?edit=<id>` query, pre-populate form, call PUT.

**API:**
| Method | Path | Contract |
|---|---|---|
| PUT | `/api/invoices/:id` | Auth. Replaces line items + header fields. 409 if status != draft. |
| DELETE | `/api/invoices/:id` | Auth. 409 if status != draft. |

**Acceptance**: User creates a draft invoice → opens it from dashboard → edits items → saves → `invoice_items` rows replaced atomically. Cannot edit a sent invoice (UI hides edit, API returns 409).

**Effort**: S.

---

### Tier 1 dependency graph
```
T0.* (Foundations) ──> T1.1 (Stripe + webhook) ──┬─> T1.2 (email)
                                                  ├─> T1.3 (recurring) ── needs T1.2
                                                  └─> T1.4 (dunning)   ── needs T1.2
T1.5 (edit/delete) is independent
```

---

## 5. Tier 2 — FreshBooks/Bonsai parity, ~3-4 weeks

### T2.1 — Expense tracking (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0009_expenses.sql`
- `apps/invoice-automation-saas/server/src/routes/expenseRoutes.ts`
- `apps/invoice-automation-saas/src/pages/Expenses.tsx`
- `apps/invoice-automation-saas/src/services/expenseService.ts`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_billable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT,            -- nullable: not all expenses are client-billable
  project_id TEXT,           -- nullable until projects exist (T2.2)
  category_id TEXT,
  vendor TEXT,
  description TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expense_date TEXT NOT NULL,
  is_billable INTEGER NOT NULL DEFAULT 0,
  invoiced_on_invoice_id TEXT, -- when rolled into an invoice as a line item
  receipt_path TEXT,           -- file on D:\, never inlined
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY(category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);
```

Receipt upload: `multipart/form-data`, store at `D:\data\invoiceflow\receipts\{user_id}\{expense_id}.{ext}`. Path comes from env `RECEIPT_DIR`, defaults under `D:\data\invoiceflow\receipts`. **No data on C:\.**

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/expenses` | Auth. Query: `from`, `to`, `clientId`, `categoryId`. |
| POST | `/api/expenses` | Auth. multipart. |
| PATCH | `/api/expenses/:id` | Auth. |
| DELETE | `/api/expenses/:id` | Auth. |
| POST | `/api/invoices/:id/items/from-expense` | Auth. Adds expense as line item, marks `invoiced_on_invoice_id`. |

**Acceptance**: User uploads a receipt → expense saved with file on D:\ → marked billable + linked to a client → opens an invoice → "add billable expenses" picker → expense appears as line item, marked invoiced.

**Effort**: M. **New deps**: `@fastify/multipart`.

---

### T2.2 — Time tracking (timer + manual) (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0010_time_tracking.sql`
- `apps/invoice-automation-saas/server/src/routes/projectRoutes.ts`
- `apps/invoice-automation-saas/server/src/routes/timeRoutes.ts`
- `apps/invoice-automation-saas/src/pages/Time.tsx`
- `apps/invoice-automation-saas/src/components/time/Timer.tsx`
- `apps/invoice-automation-saas/src/services/timeService.ts`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT,
  name TEXT NOT NULL,
  hourly_rate REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active', -- active|archived
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  client_id TEXT,
  description TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,           -- null = timer running
  duration_seconds INTEGER, -- denormalised when ended_at set
  is_billable INTEGER NOT NULL DEFAULT 1,
  hourly_rate REAL,
  invoiced_on_invoice_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_time_user_started ON time_entries(user_id, started_at);
```

**API:**
| Method | Path | Contract |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/projects[/:id]` | Standard CRUD. |
| GET | `/api/time-entries` | Filters by `from`, `to`, `projectId`, `clientId`, `unbilled`. |
| POST | `/api/time-entries/start` | Body `{ projectId?, description? }`. Returns running entry. 409 if user already has running entry. |
| POST | `/api/time-entries/:id/stop` | Stops running entry, computes duration. |
| POST | `/api/time-entries` | Manual entry with `started_at`, `ended_at`. |
| POST | `/api/invoices/:id/items/from-time` | Body `{ entryIds[] }`. Groups by project, uses project rate. |

**Acceptance**: User starts a timer → leaves it running → stops 1h later → entry shows 1h, billable at project rate → opens invoice → "add unbilled time" picker → time entries become a single line item per project. Cannot start a second concurrent timer.

**Effort**: M.

---

### T2.3 — Multi-currency + exchange rates (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0011_fx.sql`
- `apps/invoice-automation-saas/server/src/fx/cache.ts` — `getRate(base, quote, date)` checks cache, else fetches Frankfurter, persists.
- `apps/invoice-automation-saas/server/src/jobs/handlers/refreshFxRates.ts` — daily refresh of major pairs

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS exchange_rates (
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate_date TEXT NOT NULL, -- YYYY-MM-DD
  rate REAL NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY(base, quote, rate_date)
);

ALTER TABLE invoices ADD COLUMN exchange_rate_to_user_currency REAL;
ALTER TABLE invoices ADD COLUMN user_currency_at_issue TEXT;
ALTER TABLE users ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'USD';
```

When an invoice is created in a non-default currency, server fetches the rate for `issue_date`, stamps both columns. Dashboard totals use these stamps so the historical view is stable even when rates change.

**Files modify:**
- `apps/invoice-automation-saas/src/pages/CreateInvoice.tsx` — currency dropdown (top 30 ISO codes).
- `apps/invoice-automation-saas/src/pages/Dashboard.tsx` — show totals in user default currency, with a tooltip showing original.

**Acceptance**: User in USD creates an invoice in EUR → server stamps the day's rate → dashboard total adds the USD-equivalent → tooltip shows "€1,500 @ 1.08 = $1,620 on 2026-05-03".

**Effort**: M. **Depends on**: T0.3 (cron for refresh).

---

### T2.4 — Tax tables (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0012_taxes.sql`
- `apps/invoice-automation-saas/server/src/routes/taxRoutes.ts`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS tax_rates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,            -- "VAT 20%", "GST", "California Sales 7.25%"
  rate_pct REAL NOT NULL,
  region_code TEXT,              -- ISO 3166-2 etc., nullable
  is_compound INTEGER NOT NULL DEFAULT 0, -- applies on subtotal+previous taxes
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE clients ADD COLUMN default_tax_rate_id TEXT;
ALTER TABLE invoice_items ADD COLUMN tax_rate_id TEXT;
ALTER TABLE invoices ADD COLUMN tax_strategy TEXT NOT NULL DEFAULT 'invoice'; -- 'invoice'|'item'
```

Server computes tax per item when `tax_strategy='item'`, summed into `invoices.tax`. UI in Create Invoice: dropdown per line item OR single dropdown at invoice level depending on strategy toggle.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/tax-rates[/:id]` | CRUD. |

**Acceptance**: User creates "VAT 20%" → assigns it as default for an EU client → creates an invoice for that client → tax auto-applies → PDF + emailed copy show tax line correctly. Switching to "per-item" strategy lets each line have its own rate.

**Effort**: M.

---

### T2.5 — Customisable invoice templates (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0013_templates.sql`
- `apps/invoice-automation-saas/server/src/pdf/templates/Classic.tsx`
- `apps/invoice-automation-saas/server/src/pdf/templates/Modern.tsx`
- `apps/invoice-automation-saas/server/src/pdf/templates/Minimal.tsx`
- `apps/invoice-automation-saas/server/src/pdf/registry.ts` — maps template id to component
- `apps/invoice-automation-saas/src/pages/Templates.tsx`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT,                  -- null = built-in
  name TEXT NOT NULL,
  base_template TEXT NOT NULL,   -- 'classic'|'modern'|'minimal'
  config_json TEXT NOT NULL,     -- {primaryColor, accentColor, logoPath, fontFamily, footerText, ...}
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE invoices ADD COLUMN template_id TEXT;
ALTER TABLE users ADD COLUMN logo_path TEXT;
```

Templates are React components selected by `base_template`; `config_json` themes them. Logo upload stored on `D:\data\invoiceflow\logos\{user_id}.{ext}`.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/templates[/:id]` | CRUD. |
| POST | `/api/templates/preview` | Returns PDF buffer for preview without saving. |
| POST | `/api/users/me/logo` | Multipart logo upload. |

**Acceptance**: User picks "Modern" template, sets accent colour `#7c3aed`, uploads a PNG logo, marks default → next invoice (PDF + email) uses these visuals.

**Effort**: M. **Depends on**: T0.6 (`@react-pdf/renderer`).

---

### Tier 2 dependency graph
```
T2.1 (expenses)  ──┐
T2.2 (time)      ──┼─> both can roll into invoices independently
T2.3 (currency)  ──┤   (T2.4 tax aware of currency)
T2.4 (tax)       ──┤
T2.5 (templates) ──┘   independent of others; depends on T0.6 only
```

---

## 6. Tier 3 — Mid-market parity (multi-tenant, integrations)

This tier is multi-week. The first item is non-negotiably **the multi-tenant migration before any other Tier 3 work**.

### T3.0 — Big-bang multi-tenant migration (L) — DO FIRST

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0014_organizations.sql`
- `apps/invoice-automation-saas/server/src/migrations/0015_tenant_backfill.sql` — pure data migration, no DDL
- `apps/invoice-automation-saas/server/src/auth/orgScope.ts` — `requireOrgId(req)` helper

**Files modify:**
- **Every route file**: add `org_id` filter to every query.
- `apps/invoice-automation-saas/server/src/auth.ts` — JWT payload gains `org_id`. Add `setCurrentOrg(userId, orgId)` and refresh helpers.
- `apps/invoice-automation-saas/server/src/routes/authRoutes.ts` — add `POST /api/auth/switch-org`, modify `me` to include orgs list.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_members (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- owner|admin|manager|user
  invited_by TEXT,
  joined_at TEXT NOT NULL,
  PRIMARY KEY(org_id, user_id),
  FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ALTER each tenant-scoped table:
ALTER TABLE clients              ADD COLUMN org_id TEXT;
ALTER TABLE invoices             ADD COLUMN org_id TEXT;
ALTER TABLE recurring_schedules  ADD COLUMN org_id TEXT;
ALTER TABLE expenses             ADD COLUMN org_id TEXT;
ALTER TABLE projects             ADD COLUMN org_id TEXT;
ALTER TABLE time_entries         ADD COLUMN org_id TEXT;
ALTER TABLE tax_rates            ADD COLUMN org_id TEXT;
ALTER TABLE invoice_templates    ADD COLUMN org_id TEXT;
ALTER TABLE expense_categories   ADD COLUMN org_id TEXT;
ALTER TABLE dunning_policies     ADD COLUMN org_id TEXT;
-- (audit_log, jobs, stripe_events, exchange_rates, email_log are NOT tenant-scoped)
```

`0015_tenant_backfill.sql`:
1. For each user, create a personal organization (`name = COALESCE(company_name, full_name, email)`, slug from email).
2. Insert `organization_members(org_id, user_id, role='owner')`.
3. Update every tenant-scoped table: `UPDATE clients SET org_id = (SELECT org_id FROM ... WHERE user_id = clients.user_id)` etc.
4. After backfill: enforce `NOT NULL` and shift unique constraints (in SQLite this requires the `CREATE TABLE new`/`INSERT SELECT`/`DROP`/`RENAME` dance — write each table out explicitly).

**Acceptance**: Existing user logs in → sees their data unchanged → JWT now contains `org_id` → can invite a second user via T3.2 → switching orgs swaps every list view.

**Effort**: L all by itself. **Touches**: literally every route. Plan a dedicated PR.

---

### T3.1 — Roles & permissions (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/auth/permissions.ts` — `can(role, action)` matrix
- `apps/invoice-automation-saas/server/src/auth/requirePermission.ts` — Fastify preHandler decorator

**Files modify:**
- Each mutating route adds `requirePermission('invoice.write')` etc.

Permissions matrix (initial):
| Action | owner | admin | manager | user |
|---|---|---|---|---|
| `org.manage` | x | x |  |  |
| `member.invite` | x | x |  |  |
| `invoice.read` | x | x | x | x |
| `invoice.write` | x | x | x |  |
| `invoice.delete` | x | x |  |  |
| `expense.write` | x | x | x | x |
| `time.write` | x | x | x | x |
| `report.read` | x | x | x |  |
| `billing.manage` | x | x |  |  |

**API**: each route returns `403` with `{ error: "Permission denied", required: "invoice.write" }`.

**Acceptance**: A `user` cannot delete invoices via API or UI. An `admin` can.

**Effort**: M. **Depends on**: T3.0.

---

### T3.2 — Member management UI (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/routes/memberRoutes.ts`
- `apps/invoice-automation-saas/src/pages/Settings/Members.tsx`
- `apps/invoice-automation-saas/server/src/email/templates/MemberInvite.tsx`

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/org/members` | List. |
| POST | `/api/org/members/invite` | `{ email, role }`. Sends invite email. |
| PATCH | `/api/org/members/:userId` | Change role. |
| DELETE | `/api/org/members/:userId` | Remove. |
| GET | `/api/invitations/:token` | Public — preview invite. |
| POST | `/api/invitations/:token/accept` | Auth — link to current user. |

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS invitations (
  token TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

**Acceptance**: Owner invites teammate by email → teammate clicks email link → signs up or logs in → joins org with assigned role. Owner can change roles + remove members.

**Effort**: M.

---

### T3.3 — Audit log UI + broader event coverage (S)

**Files create:**
- `apps/invoice-automation-saas/src/pages/Settings/AuditLog.tsx`
- `apps/invoice-automation-saas/server/src/routes/auditRoutes.ts`

**Files modify:**
- Every mutating route (already calling `recordAudit` from T0.7) gets coverage check.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/audit-log` | Auth + `report.read`. Filters: `from`, `to`, `actorUserId`, `action`, `entityType`, `entityId`. |

**Acceptance**: Admin opens Audit Log → sees a paginated, filterable table of every state change (invoice created/updated/paid, member invited, role changed, payment recorded, webhook processed).

**Effort**: S. **Depends on**: T0.7, T3.0.

---

### T3.4 — QuickBooks Online integration (L)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0016_integrations.sql`
- `apps/invoice-automation-saas/server/src/integrations/quickbooks/oauth.ts`
- `apps/invoice-automation-saas/server/src/integrations/quickbooks/client.ts`
- `apps/invoice-automation-saas/server/src/integrations/quickbooks/sync.ts`
- `apps/invoice-automation-saas/server/src/jobs/handlers/qboSync.ts`
- `apps/invoice-automation-saas/src/pages/Settings/Integrations.tsx`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS integration_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'quickbooks'|'xero'|...
  external_account_id TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(org_id, provider),
  FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS integration_sync_log (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,    -- invoice|client|payment
  local_id TEXT NOT NULL,
  external_id TEXT,
  direction TEXT NOT NULL,       -- push|pull
  status TEXT NOT NULL,          -- success|failed
  error TEXT,
  synced_at TEXT NOT NULL,
  FOREIGN KEY(connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE
);
```

OAuth flow: `GET /api/integrations/quickbooks/connect` → redirect to Intuit → callback `GET /api/integrations/quickbooks/callback` → exchange code, store tokens (AES-256 with `INTEGRATION_KEY` env, 32 bytes hex). Token refresh handled by job that wakes up daily checking `expires_at - 1 day`.

Sync: invoice paid → enqueue `qbo-push-invoice` → push via QuickBooks REST API (Sales Receipt or Invoice + Payment) → write `integration_sync_log`. Pull-side (customers from QBO into clients) is a manual sync button.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/integrations/quickbooks/connect` | Redirect. |
| GET | `/api/integrations/quickbooks/callback` | Handle code. |
| POST | `/api/integrations/quickbooks/disconnect` | Revoke tokens. |
| POST | `/api/integrations/quickbooks/sync/clients` | Pull. |
| GET | `/api/integrations/sync-log` | View history. |

**Acceptance**: Admin connects QBO → sees green "Connected" pill → marks an invoice paid → 30s later it appears in QBO → sync log records the push.

**Effort**: L. **Depends on**: T3.0, T3.1.

---

### T3.5 — Outbound webhooks (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0017_webhooks.sql`
- `apps/invoice-automation-saas/server/src/routes/webhookConfigRoutes.ts`
- `apps/invoice-automation-saas/server/src/jobs/handlers/deliverWebhook.ts`
- `apps/invoice-automation-saas/server/src/webhooks/dispatcher.ts`
- `apps/invoice-automation-saas/src/pages/Settings/Webhooks.tsx`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,           -- HMAC signing secret
  events_json TEXT NOT NULL,      -- ["invoice.created","invoice.paid","invoice.overdue"]
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_status_code INTEGER,
  last_response_body TEXT,
  delivered_at TEXT,
  failed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(endpoint_id) REFERENCES webhook_endpoints(id) ON DELETE CASCADE
);
```

Dispatcher subscribes to internal events (audit log writes are the canonical event source) and enqueues a `deliver-webhook` job per matching endpoint. HMAC-SHA256 signature in `X-InvoiceFlow-Signature` header.

**API:**
| Method | Path | Contract |
|---|---|---|
| GET/POST/PATCH/DELETE | `/api/webhook-endpoints[/:id]` | CRUD. |
| POST | `/api/webhook-endpoints/:id/test` | Deliver synthetic event. |
| GET | `/api/webhook-endpoints/:id/deliveries` | History. |

**Acceptance**: User adds endpoint pointing to webhook.site → marks an invoice paid → endpoint receives signed POST within 30s → delivery log shows 200.

**Effort**: M. **Depends on**: T0.3, T3.0.

---

### T3.6 — Client portal upgrade (M)

Today's "client portal" is just a tokenised public link. Tier 3 adds a real authenticated portal so clients see their full invoice history, download PDFs, pay outstanding balances.

**Files create:**
- `apps/invoice-automation-saas/server/src/migrations/0018_portal.sql`
- `apps/invoice-automation-saas/server/src/routes/portalRoutes.ts`
- `apps/invoice-automation-saas/server/src/auth/portalAuth.ts`
- `apps/invoice-automation-saas/src/pages/Portal/Login.tsx`
- `apps/invoice-automation-saas/src/pages/Portal/Invoices.tsx`
- `apps/invoice-automation-saas/src/pages/Portal/InvoiceDetail.tsx`

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS portal_clients (
  client_id TEXT PRIMARY KEY,
  password_salt BLOB,
  password_hash BLOB,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS portal_magic_links (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);
```

Auth: magic-link primary (email "Click here to access your portal"), with optional password. Portal cookies are scoped to `/api/portal/*` to keep them isolated from owner cookies.

**API:**
| Method | Path | Contract |
|---|---|---|
| POST | `/api/portal/magic-link/request` | `{ email }`. Always returns 204 (no enumeration). |
| POST | `/api/portal/magic-link/consume` | `{ token }`. Sets portal cookie. |
| GET | `/api/portal/me` | Auth: portal cookie. |
| GET | `/api/portal/invoices` | Auth: portal. List for client. |
| GET | `/api/portal/invoices/:id` | Auth: portal. |
| GET | `/api/portal/invoices/:id/pdf` | Auth: portal. Returns PDF. |
| POST | `/api/portal/invoices/:id/pay` | Auth: portal. Creates Stripe Checkout, returns URL. |

**Acceptance**: Client receives invoice email → clicks "View all invoices" → magic-link login → sees a list of every invoice the firm has sent them → downloads PDFs → pays outstanding ones via Stripe.

**Effort**: M. **Depends on**: T1.1, T1.2, T3.0.

---

### T3.7 — Reports & analytics (M)

**Files create:**
- `apps/invoice-automation-saas/server/src/routes/reportRoutes.ts`
- `apps/invoice-automation-saas/server/src/reports/queries.ts`
- `apps/invoice-automation-saas/src/pages/Reports.tsx`

**API (all auth + `report.read`):**
| Method | Path | Contract |
|---|---|---|
| GET | `/api/reports/revenue` | `?from&to&groupBy=month\|week\|day&currency=` Returns time series. |
| GET | `/api/reports/outstanding` | Aging buckets: 0-30, 31-60, 61-90, 90+. |
| GET | `/api/reports/top-clients` | Top N clients by paid revenue. |
| GET | `/api/reports/mrr` | Sum of active recurring schedules normalised to monthly. |
| GET | `/api/reports/expenses-by-category` | For tax season. |
| GET | `/api/reports/profit-loss` | Income (paid invoices) − expenses, by month. |
| GET | `/api/reports/export.csv` | Streamed CSV for any of the above. |

All queries scoped by `org_id`, currency-normalised using stamped `exchange_rate_to_user_currency` from T2.3.

**Acceptance**: Admin opens Reports → sees revenue chart YoY → switches to outstanding aging → sees buckets → exports CSV → file matches on-screen totals.

**Effort**: M. **Depends on**: T2.3, T2.1.

---

### T3.8 — Multi-instance readiness (S, optional)

If/when user wants to run >1 server instance:
- Replace in-process `EventEmitter` (`server/src/events.ts`) with a Redis pub/sub (`ioredis`) — only file that needs to change for SSE; subscribers still listen by `user:${userId}` channel.
- Swap `node-cron` ticking with a single elected leader via Redis `SETNX` lease.
- This unlocks horizontal scale and preempts the conditional Postgres migration.

**Effort**: S to swap event bus; M to introduce leader election. Mark as **conditional**.

---

### Tier 3 dependency graph
```
T3.0 (multi-tenant)  ──> T3.1 (RBAC) ──> T3.2 (members)
                    └──> T3.3 (audit UI)
                    └──> T3.4 (QBO) ──── needs T3.1
                    └──> T3.5 (out-webhooks)
                    └──> T3.6 (client portal)
                    └──> T3.7 (reports)
T3.8 (multi-instance) optional, last
```

---

## 7. Architectural tensions called out (and resolved)

| Tension | Resolution |
|---|---|
| Cookie sessions vs multi-tenant | JWT gains `org_id` claim; `POST /api/auth/switch-org` re-issues. No DB session store needed for v1. |
| SQLite vs Postgres | SQLite WAL fine for Tier 1-2 (and most Tier 3). Postgres flagged as **conditional** Tier 3 work, only if measured write contention or per-tenant data residency demands it. Schema kept Postgres-portable. |
| Client-side PDF vs server-side | Switch to `@react-pdf/renderer` everywhere (Tier 0). One source of truth, client and server render identical output. Client downloads from `/api/invoices/:id/pdf` instead of generating locally; the legacy `jspdf` path is deleted in Tier 1. |
| In-memory `events` SSE vs multi-instance | Documented limitation. Tier 3.8 swaps in Redis pub/sub when needed. |
| Existing `recurring_json`/`parent_invoice_id` | Read-side moves to `recurring_schedules` (Tier 1.3) with a backfill migration. Old columns kept temporarily for rollback safety, dropped in Tier 2 cleanup. |
| Cookie `SameSite=lax` (current) vs `Strict` | Keep `lax` in dev (Vite + Fastify on different ports). Flip to `Strict` in production where SPA + API share an origin. |
| `mockApi.ts` fallback in production code | **Delete in Tier 0**. Violates the no-mock rule and silently lies to users when the API is down. |
| `PROJECT_GUIDE.md` describes a different app | Rewrite in Tier 0. |

---

## 8. Cumulative effort estimate

| Tier | Effort estimate | Notes |
|---|---|---|
| Tier 0 (Foundations) | 5-7 dev-days | Hard prereq. |
| Tier 1 (MVP parity) | 1.5-2 weeks | Stripe + Resend + Recurring + Dunning + Edit. |
| Tier 2 (FreshBooks parity) | 3-4 weeks | Expenses, Time, Currency, Tax, Templates. |
| Tier 3 (mid-market) | 5-7 weeks | Multi-tenant migration alone is L; QBO is L; portal + webhooks + reports + RBAC. |
| **Total** | **~10-14 weeks** of focused single-developer work. |

---

## 9. Critical files for implementation

The most load-bearing files for the entire plan — every Tier 0/1 task either creates or modifies these:

- `C:\dev\apps\invoice-automation-saas\server\src\migrate.ts` — **must** be rewritten to a versioned runner before any feature work (T0.1).
- `C:\dev\apps\invoice-automation-saas\server\src\index.ts` — registration point for new routes, jobs runner, rate limiter, raw-body webhook parser.
- `C:\dev\apps\invoice-automation-saas\server\src\routes\invoiceRoutes.ts` — touched by T1.1 (payments), T1.3 (recurring), T1.5 (edit), T2.1/T2.2 (line-items from expenses/time), T2.4 (tax), T2.5 (template), T3.0 (org_id).
- `C:\dev\apps\invoice-automation-saas\src\services\invoiceService.ts` — client-side counterpart; mockApi removal (T0.2), all new endpoints, currency display.
- `C:\dev\apps\invoice-automation-saas\src\components\invoice\PaymentForm.tsx` — replace the placeholder "mark as paid (local simulation)" with real Stripe Checkout (T1.1).