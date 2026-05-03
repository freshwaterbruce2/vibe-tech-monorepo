# invoice-automation-saas — AI Context

## What this is
Single-tenant invoice SaaS with recurring billing, automated dunning, real Stripe Checkout, and PDF-attached email delivery via Resend. Tier 1 (~Zoho Invoice MVP) shipped; Tier 2 (~FreshBooks parity) and Tier 3 (~mid-market with multi-tenant + QBO sync) tracked in `docs/FEATURE-PARITY-PLAN.md`.

For the full architecture and per-file map, read `PROJECT_GUIDE.md` first — it is up to date as of 2026-05-03.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Vite + React 19 (client) + Fastify v5 (API server)
- **DB**: better-sqlite3 with versioned migrations at `server/src/migrations/`, file at `D:\databases\invoiceflow.db`
- **Payments**: Stripe Checkout server-side + signed webhook (replay-safe via `stripe_events`)
- **Email**: Resend SDK + `react-email` templates + Svix signature verification on `/api/webhooks/resend`
- **PDF**: `@react-pdf/renderer` server-side for email attachment AND client-side for download (single component, two render targets)
- **Jobs**: in-process `node-cron` + `jobs` table with retries, lock-based idempotency, exponential backoff
- **Audit**: `audit_log` table written on every state-changing operation (invoice paid, recurring generated, dunning policy updated)

## Dev
```powershell
pnpm --filter invoice-automation-saas dev       # Vite SPA :5173
pnpm --filter invoice-automation-saas dev:api   # Fastify API :8787
pnpm --filter invoice-automation-saas build     # SPA -> dist/
pnpm --filter invoice-automation-saas build:api # Server -> server/dist/
pnpm --filter invoice-automation-saas test -- --run    # 98 tests at Tier 1 ship
```

## Required env (per PROJECT_GUIDE.md - full list there)

| Var | For |
|---|---|
| `DATABASE_PATH` | SQLite (must be on D:\) |
| `STRIPE_SECRET_KEY` | Stripe SDK |
| `STRIPE_WEBHOOK_SECRET` | /api/webhooks/stripe signature verify |
| `RESEND_API_KEY` | Resend SDK |
| `RESEND_WEBHOOK_SECRET` | /api/webhooks/resend Svix signature verify |
| `EMAIL_FROM` | Verified Resend sender |
| `APP_BASE_URL` | Stripe redirects + email pay links |

Env getters in `server/src/clients/{stripe,resend}.ts` throw with a clear "X is not set" on first call, so misconfig fails fast.

## Notes
- Two processes in dev (SPA + API) — Vite proxies `/api` to `:8787`
- Migrations at `server/src/migrations/NNNN_*.sql` are append-only; never modify a shipped file. Add a new numbered file to alter schema.
- The webhook routes (`/api/webhooks/stripe`, `/api/webhooks/resend`) use a raw-body parser scoped via Fastify's encapsulated `register` block so signature verification has the unmodified bytes; the global JSON parser is unchanged.
- Active project lock applies — see `D:\active-project\active-project.json` and `.claude/rules/active-project-lock.md`.
- Per `.claude/rules/no-mock-or-placeholder-code.md`: no stubs in production code. Tests are the only place mocks belong.
