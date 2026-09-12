# Active Context: invoice-automation-saas (InvoiceFlow)

## Status: LIVE IN PRODUCTION (Railway)

Last updated: 2026-09-11

### Production Deployment Summary

- **Live URL:** https://invoiceflow-production-86e9.up.railway.app
- **Custom Domain:** https://invoiceflow.vibe-tech.org (CNAME target: `l7kkzqu9.up.railway.app`) — Live & Healthy
- **Health Endpoint:** `/api/health` -> `{"ok": true, "ts": ...}`
- **Hosting Platform:** Railway (Project: `invoiceflow` / Service: `invoiceflow`)
- **Persistent Volume:** `invoiceflow-volume` mounted at `/data` (SQLite WAL `invoiceflow.db`)
- **Deployment ID:** `4f6255af-2f3e-430d-8d8a-9329d6238826` (Status: SUCCESS)
- **AI Gateway Status:** Live connected (`https://vibe-ai-gateway-734857480460.us-east4.run.app`), key `vibe_sk_invoiceflow_prod`
- **Square Status:** Production credentials injected (`SQUARE_ENVIRONMENT=production`, `SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SECRET`)

### Architectural Changes (2026-09-11)

1. **AI Payment Reminder Smart-Drafting & UI:**
   - Implemented `SmartDraftModal.tsx` in `src/components/invoice/` with Tone Selector (`friendly`, `firm`, `urgent`, `final_notice`), custom instructions prompt, live AI Gateway preview, editable Subject & Body, "Copy Text" button, "Open in Mail App (mailto)" fallback, and "Send Reminder" button.
   - Wired 1-click "Generate AI Payment Reminder" button directly onto overdue invoices in `Dashboard.tsx`, plus options menu action for all active invoices.
   - Built client service `src/services/dunningService.ts`.
   - Built server endpoint `POST /api/dunning/send-reminder` in `server/src/routes/dunningRoutes.ts` with `sendDraftReminder` in `server/src/email/send.ts`.
   - Verified 19 passing tests across dunning routes, fake-db, and AI Gateway client.
   - Fixed container `npm install` by pruning unused workspace dependency from `package.json`.
   - Successfully deployed container to Railway (deployment `4f6255af-2f3e-430d-8d8a-9329d6238826`), verified live health check, and verified live smoke test against `POST /api/dunning/smart-draft`.

### Architectural Changes (2026-09-08)

1. **Standalone Containerization:**
   - Vendored workspace packages into `server/src/shared/`:
     - `@vibetech/auth` -> `server/src/shared/auth/`
     - `@vibetech/monetization` -> `server/src/shared/monetization/`
     - `@vibetech/billing` -> `server/src/shared/billing/`
     - `@vibetech/emails` -> `server/src/shared/emails/`
     - `@vibetech/email` -> `server/src/shared/email/`
     - `@vibetech/payments` -> `server/src/shared/payments/`
   - Replaced workspace references with local relative NodeNext imports.
   - Fixed `server/src/jobs/cron.ts` typing for `node-cron` scheduled tasks.
   - Created standalone multi-stage `Dockerfile` with native `better-sqlite3` build.
   - Configured `.dockerignore` for clean builds.

2. **Environment & Tiers:**
   - Standard pricing tiers: Starter ($0 Free), Pro ($19/mo), Team ($49/mo).
   - Default tenant plan configured to `pro` via `INVOICE_SAAS_DEFAULT_PLAN=pro`.
   - `AUTH_SECRET` provisioned securely with 64-char crypto token.
   - `APP_BASE_URL` mapped to live Railway service URL.
   - Ready for live Stripe keys (`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`).

### Local Persistence & Snapshots

- Canonical working source: `C:\projects\vibe-tech-monorepo\apps\vibe-invoice`
- Standalone snapshot: `C:\projects\_vibe-snapshots\vibe-invoice-live-20260908`
- Deploy metadata: `apps/vibe-invoice/DEPLOYMENT.md`
