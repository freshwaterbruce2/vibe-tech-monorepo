# VibeTech — SaaS Web Apps (live-tree verified 2026-06-18)

This document is the source-of-truth reference for the VibeTech "SaaS Web Apps" family:
multi-tenant-capable web products built on a single shared stack — Vite 7 + React 19
single-page client, a Fastify v5 API server (`server/src/index.ts`), shared `@vibetech/*`
workspace packages (auth, billing, payments, entitlements, emails, analytics, landing,
monetization, ai), and SQLite data on `D:\` only. Every fact below was read directly from
each app's `package.json`, server source, and `vite.config.ts` on the live `V:\monorepo`
filesystem; nothing here is inferred from prior documents.

> SUPERSEDES and invalidates the following stale documents (delete them from any
> NotebookLM / knowledge-base context): "CANONICAL FACTS (disk-verified) 2026-06-16",
> "VibeTech Ecosystem Review and System Health Audit 2026", "source1_vtde_status.md",
> "source_vtde.md", "claudecode06142026". Those contain FALSE state — a live `apps/vtde`
> Tauri app, a `WORKSPACE.json`, a `guard-protect-source.ps1` "error". The live
> `V:\monorepo` filesystem is the only source of truth.

How to read claims from any AI grounded only in uploaded docs: it CANNOT see the live
filesystem, run PowerShell, or observe hooks. Any statement like "disk-verified", "system
health sweep confirmed", or "the hook error you encountered" is an inference from uploaded
text, not an observation. Trust the live tree over any such claim.

---

## Shared architecture (applies to every app below)

- **Client**: React 19.2.4 + react-dom 19.2.4, Vite ^7.3.1, `@vitejs/plugin-react` ^5.2.0,
  TypeScript 5.9.3 (strict). Built with `vite build` into `dist/`.
- **API server**: Fastify ^5.8.4 with `@fastify/cors` ^11.2.0 (several add `fastify-raw-body`
  ^5.0.0 for Stripe webhook raw-body signature verification). Entry: `server/src/index.ts`,
  run in dev with `tsx watch`, built with `tsc -p server/tsconfig.json` to `server/dist/`.
- **Shared packages** (workspace:* references): `@vibetech/auth`, `@vibetech/billing`,
  `@vibetech/payments`, `@vibetech/monetization`, `@vibetech/entitlements`,
  `@vibetech/emails` + `@vibetech/email`, `@vibetech/analytics`, `@vibetech/landing`,
  `@vibetech/ai`, `@vibetech/db-app`. Exact set varies per app (listed below).
- **Auth/data**: Authentication is centralized — `@vibetech/auth`'s `openAuthDb()` opens the
  shared `D:\databases\auth.db` workspace auth store, used via each app's
  `server/src/authSession.ts`. Apps with their own domain data point a separate per-app DB
  on `D:\databases\` (see each section). All DB paths resolve from env vars; defaults live on
  `D:\` per the workspace paths policy.
- **Common scripts** (most apps): `dev` (Vite client), `dev:api` (build shared packages then
  `tsx watch server/src/index.ts`), `build` (Vite client), `build:api` (tsc server),
  `start:api` (run built server), `ship:check` (full build + `server/scripts/ship-check.ts`),
  `test` (`vitest run --passWithNoTests`), `typecheck` (`tsc --noEmit`). Some also have
  `test:e2e` (Playwright) and `ux:polish` (`scripts/ralph_loop_runner.sh`).
- **Versioning**: every app is at `"version": "0.1.0"`, `"private": true`, `"type": "module"`.

---

## cme-track

- **Package name**: `cme-track`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`,
  `fastify-raw-body`. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `db-app`,
  `email`, `emails`, `landing`, `monetization`, `payments`.
- **Dev / build**: `dev` runs Vite on `--host 127.0.0.1 --port 4360`; `dev:api` builds shared
  packages (via Nx `run-many`) then `tsx watch server/src/index.ts`; `build` = `vite build`;
  `build:api` = tsc server. Also `test:e2e` (Playwright) and `ux:polish`.
- **Port**: client dev 4360 (from `package.json` dev script). Not listed in `docs/PORTS.md`.
- **Database**: shared auth store `D:\databases\auth.db`; app data DB `D:\databases\cme-track.db`
  (present on disk; test fixtures `cme-track-test.db`, `cme-track-test-auth.db`,
  `cme-track-e2e-auth.db` confirm the `cme-track*` naming).
- **Purpose**: Continuing Medical Education (CME) credit tracking SaaS — a subscription web app
  for clinicians to record and track CME activities and credits, gated behind the shared auth +
  billing + entitlements stack.
- **Current state**: Has client + Fastify server, Playwright E2E config, and a `ship:check`
  pipeline (`server/scripts/ship-check.ts`) that runs against seeded test DBs on `D:\`. State
  beyond "wired and buildable" is not asserted here.

## prior-auth-pro

- **Package name**: `prior-auth-pro`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors` and
  `@fastify/rate-limit` ^10.3.0. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`,
  `emails`, `entitlements`, `landing`. (Uses `entitlements`, not `monetization`/`db-app`.)
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4320`; `build:shared:api` builds shared
  packages via `pnpm --dir` plus `server/scripts/build-ai-runtime.mjs`; standard `build`,
  `build:api`, `ship:check`. No `test:e2e`/`ux:polish` scripts.
- **Port**: client dev 4320 (note: shared with several other SaaS apps' default — run one at a
  time). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; per-app DB `D:\databases\prior-auth-pro.db`
  (test fixture `prior-auth-pro-test-auth.db` on disk confirms naming).
- **Purpose**: Prior-authorization automation SaaS for healthcare — helps generate/manage
  insurance prior-authorization requests and appeals (server has `appeals.ts`,
  `subscriptionState.ts`, `stripeWebhook.ts`), behind auth + Stripe billing + rate limiting.
- **Current state**: Client + Fastify server with appeals logic, Stripe webhook handling,
  rate limiting, and unit tests (`appeals.test.ts`, `rateLimit.test.ts`,
  `stripeWebhook.test.ts`, `subscriptionState.test.ts`). AI runtime is built via a dedicated
  `build-ai-runtime.mjs` step.

## proposal-review-saas

- **Package name**: `proposal-review-saas`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`.
  Shared: `@vibetech/auth`, `analytics`, `billing`, `emails`, `entitlements`, `landing`.
  (No `ai`/`payments`/`monetization` in deps.)
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4320`; `build:shared:api` builds shared
  packages via `pnpm --dir`; standard `build`, `build:api`, `ship:check`.
- **Port**: client dev 4320 (shared default). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; per-app DB `D:\databases\proposal-review.db`
  (test fixtures `proposal-review-test-auth.db`, `proposal-review-test-auth-unit.db` on disk
  confirm the `proposal-review*` naming).
- **Purpose**: Proposal review SaaS — a web tool for reviewing/scoring proposal documents
  (server has `reviewEngine.ts`), behind the shared auth + billing + entitlements stack.
- **Current state**: Client + Fastify server with a review engine and unit tests
  (`reviewEngine.test.ts`, `authSession.test.ts`) plus a `ship:check` pipeline.

## vibe-booking-backend

- **Package name**: `vibe-booking-backend`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`,
  `fastify-raw-body`. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `db-app`,
  `email`, `emails`, `landing`, `monetization`, `payments`. Server includes an
  `expediaClient.ts` (with `expediaClient.test.ts`).
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 3020`; `build:shared:api` via Nx
  `run-many` (includes `@vibetech/db-app`, `@vibetech/shared-config`); standard `build`,
  `build:api`, `ship:check`; plus `test:e2e` (Playwright) and `ux:polish`.
- **Port**: client dev 3020 (from dev script). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; per-app DB `D:\databases\vibe-booking-backend.db`
  (test fixtures `vibe-booking-backend-test-auth.db`, `vibe-booking-backend-e2e-auth.db` on
  disk confirm naming).
- **Purpose**: Hotel/travel booking backend SaaS — booking-flow API integrating an Expedia
  client, behind auth + Stripe billing + payments. Pairs with the `vibe-booking-v2` front end
  and the legacy `vibe-booking` app.
- **Current state**: Client shell + Fastify server with an Expedia integration client and unit
  test, Playwright E2E config, and a `ship:check` pipeline.

## vibe-booking-v2

- **Package name**: `vibe-booking-v2`
- **Framework / key deps**: Vite 7 + React 19 client with `react-router-dom` ^7.15.1 and
  `lucide-react` 0.563.0; Fastify 5 API with `@fastify/cors`, `fastify-raw-body`. Shared:
  `@vibetech/ai`, `analytics`, `auth`, `billing`, `email`, `emails`, `landing`, `monetization`,
  `payments`. Server source includes `bookings.ts` and `routes.ts`.
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 5090` (also set as `server.port: 5090`
  in `vite.config.ts`); `build:shared:api` builds shared packages via `pnpm --dir`; standard
  `build`, `build:api`, `ship:check`; plus `test:e2e` (Playwright) and `ux:polish`. Ships with
  `Dockerfile`, `railway.json`, `vercel.json`, and a `DEPLOYMENT.md`.
- **Port**: client dev 5090 (vite.config + dev script). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db` for auth/sessions; the booking domain data is
  served through the booking server (pairs with `vibe-booking-backend`). No dedicated app-DB
  default is hardcoded in this app's own `server/src` (it has no `db.ts`).
- **Purpose**: Second-generation hotel booking front end — a routed React SPA with its own
  Fastify booking routes, packaged for Railway/Vercel/Docker deployment. The "v2" rebuild of
  the booking product.
- **Current state**: Full client (react-router) + Fastify server (`bookings.ts`, `routes.ts`),
  Playwright tests, and deployment manifests for Railway, Vercel, and Docker.

## vibe-dental

- **Package name**: `vibe-dental`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`,
  `fastify-raw-body`. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `db-app`,
  `email`, `emails`, `landing`, `monetization`, `payments`.
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4320`; `build:shared:api` via Nx
  `run-many`; note `dev:api` here is just `tsx watch server/src/index.ts` (no pre-build step,
  unlike the others); standard `build`, `build:api`, `ship:check`; plus `test:e2e`/`ux:polish`.
- **Port**: client dev 4320 (shared default). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; dental scheduling data DB
  `D:\databases\dental_scheduler.db` (present on disk; test fixtures `vibe-dental-test.db`,
  `vibe-dental-test-auth.db` confirm the app's `vibe-dental*` test naming).
- **Purpose**: Dental practice scheduling SaaS — appointment/scheduling web app for a dental
  office, behind auth + Stripe billing + payments.
- **Current state**: Client + Fastify server, Playwright E2E config, and a `ship:check`
  pipeline that exercises `APP_DB_PATH` (dental test DB) and `AUTH_DB_PATH`.

## vibe-discharge

- **Package name**: `vibe-discharge`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`.
  Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `email`, `emails`, `landing`,
  `monetization`, `payments`. (No `db-app`/`fastify-raw-body`.)
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4320`; `build:shared:api` via Nx
  `run-many`; standard `build`, `build:api`, `ship:check`. No `test:e2e`/`ux:polish` scripts.
- **Port**: client dev 4320 (shared default). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; per-app DB resolves to
  `D:\databases\discharge_ez.db` (from `server/src/db.ts`:
  `path.join(process.env.DATA_DIR ?? 'D:\\databases', 'discharge_ez.db')`). Test fixtures
  `vibe-discharge-test-auth.db`, `discharge-test-auth-unit.db` exist on disk.
- **Purpose**: Patient discharge-instructions SaaS — a web app for generating/managing hospital
  discharge documentation, behind auth + billing.
- **Current state**: Client + Fastify server with its own `db.ts` (better-sqlite3, `D:\`-guarded
  path), auth-session unit test, and a `ship:check` pipeline.

## vibe-invoice

- **Package name**: `vibe-invoice` (AI context calls the product "invoice-automation-saas")
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cookie`,
  `@fastify/cors`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/static`. Persistence:
  `better-sqlite3` 12.6.2. Payments: `stripe` ^22.1.0 + `@stripe/stripe-js` ^9.0.0 + `svix`
  (webhook verification). Email: `resend` ^6.12.2 + `react-email` + `@react-email/*`. PDF:
  `@react-pdf/renderer` ^4.5.1, `jspdf`, `html2canvas`. Jobs: `node-cron` ^4.2.1. Plus
  `react-router-dom`, `react-hook-form`, `recharts`, `framer-motion`, `@sentry/react`,
  Tailwind 4, ESLint/Husky/commitlint, Testing Library. The richest stack of this family.
- **Dev / build**: `dev` plain `vite` (no `--port` flag — `vite.config.ts` sets
  `server.port: 3000`); `dev:api` = `tsx watch server/src/index.ts`; `build` = `tsc && vite build`;
  `build:api`, `start:api`, `build:all`; `lint` (eslint, max-warnings 0); `test`/`test:ui`/
  `test:coverage` (Vitest). (Note: the app's `CLAUDE.md` documents Vite on :5173 and API on
  :8787; the checked-in `vite.config.ts` server.port is 3000 — treat the config file as
  authoritative for the client port.)
- **Port**: client dev 3000 (vite.config). API listens on its own Fastify port. Not in
  `docs/PORTS.md`.
- **Database**: `D:\databases\invoiceflow.db` via `server/src/db.ts`
  (`process.env.DATABASE_PATH || "D:\\databases\\invoiceflow.db"`), better-sqlite3 with
  versioned `server/src/migrations/NNNN_*.sql` (append-only). Verify fixtures
  `invoiceflow-verify.db`, `invoiceflow-verify-tier2.db` exist on disk. Auth still uses the
  shared store.
- **Purpose**: Invoice automation SaaS — recurring billing, automated dunning, real Stripe
  Checkout with signed/replay-safe webhooks, and PDF-attached invoice email delivery via
  Resend. Single-tenant at Tier 1.
- **Current state**: Per the app's `CLAUDE.md`, Tier 1 (~Zoho Invoice MVP) shipped; Tier 2
  (~FreshBooks parity) and Tier 3 (multi-tenant + QuickBooks-Online sync) are tracked in
  `docs/FEATURE-PARITY-PLAN.md`. Has audit logging, `jobs` table with retries/backoff, and
  `verify-criteria` scripts. (Exact passing test counts are not re-asserted here.)

## vibe-portal

- **Package name**: `vibe-portal`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`,
  `fastify-raw-body`. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `db-app`,
  `email`, `emails`, `landing`, `monetization`, `payments`.
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4330`; `build:shared:api` via Nx
  `run-many`; standard `build`, `build:api`, `ship:check`; plus `test:e2e`/`ux:polish`.
- **Port**: client dev 4330 (from dev script). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; per-app DB `D:\databases\vibe-portal.db`
  (present on disk; test fixtures `vibe-portal-test.db`, `vibe-portal-test-auth.db` confirm).
- **Purpose**: Customer/client portal SaaS — a hosted portal front end (Stripe setup +
  entitlements) intended as a reusable customer-facing account/portal product.
- **Current state**: Client + Fastify server, Playwright E2E config, and a `ship:check`
  pipeline exercising `APP_DB_PATH` (`vibe-portal-test.db`) and `AUTH_DB_PATH`.

## vibe-reminder

- **Package name**: `vibe-reminder`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`.
  Persistence: `better-sqlite3` 12.6.2 (+ `@types/better-sqlite3`). Email: `resend` ^6.12.2.
  Shared: `@vibetech/auth`, `analytics`, `billing`, `emails`, `entitlements`, `landing`. (Uses
  `entitlements`; no `ai`/`payments`/`monetization`/`db-app`.)
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 4320`; `build:shared:api` builds shared
  packages via `pnpm --dir`; standard `build`, `build:api`, `ship:check`. No `test:e2e`/`ux:polish`.
- **Port**: client dev 4320 (shared default). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; appointment data DB defaults to
  `D:\databases\appointment-reminder-saas.db` (from `server/src/db.ts`
  `DEFAULT_DATABASE_PATH`, guarded to `D:\` locally or `/data` on Railway via
  `APPOINTMENTS_DATABASE_PATH`). Test fixtures `appointment-reminder-saas.db`,
  `appointment-reminder-saas-test.db`, `vibe-reminder-test-auth.db` exist on disk.
- **Purpose**: Appointment-reminder SaaS — schedules and sends appointment reminders (Resend
  email), backed by a local SQLite appointments DB, behind auth + billing + entitlements.
- **Current state**: Client + Fastify server with a `db.ts` enforcing the `D:\`/`/data` storage
  policy, Resend email, and a `ship:check` pipeline.

## vibe-reminder-v2

- **Package name**: `vibe-reminder-v2`
- **Framework / key deps**: Vite 7 + React 19 client; Fastify 5 API with `@fastify/cors`,
  `fastify-raw-body`. Shared: `@vibetech/auth`, `analytics`, `ai`, `billing`, `email`, `emails`,
  `landing`, `monetization`, `payments`. (v2 swaps `entitlements` for the
  `monetization`/`payments`/`ai` set used by the newer SaaS apps.)
- **Dev / build**: `dev` Vite `--host 127.0.0.1 --port 5330`; `build:shared:api` via Nx
  `run-many`; standard `build`, `build:api`, `ship:check`. No `test:e2e`/`ux:polish`.
- **Port**: client dev 5330 (from dev script). Not in `docs/PORTS.md`.
- **Database**: shared `D:\databases\auth.db`; appointment data DB defaults to
  `D:\databases\appointment-reminder-saas.db` (from `server/src/db.ts`, same `D:\`/`/data`
  guard via `APPOINTMENTS_DATABASE_PATH`). Test fixtures `appointment-reminder-v2-test.db`,
  `vibe-reminder-v2-test-auth.db` exist on disk.
- **Purpose**: Second-generation appointment-reminder SaaS — the v2 rebuild on the newer shared
  billing/payments/ai stack.
- **Current state**: Client + Fastify server sharing the v1 appointments `db.ts` storage
  pattern, with its own `ship:check` pipeline and v2-specific test DBs.

---

## Factory smoke fixtures (not products)

These are app-factory scaffolding/smoke-test fixtures, NOT shippable products. They exist to
verify the app-factory generators and CI; do not treat them as SaaS apps:

- `_-factory-runtime-smoke`
- `factory-saas-smoke`
- `factory-verify`
- `test-factory-app`

(Per `docs/canonical-facts.md`, the full app-factory smoke set under `apps/` also includes
`factory-landing-smoke` and `factory-tauri-smoke`.)
