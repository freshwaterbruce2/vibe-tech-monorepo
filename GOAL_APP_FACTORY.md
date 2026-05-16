# VIBE-TECH APP FACTORY — Codex Mission Brief

**Owner:** Bruce Freshwater (The Architect)
**Repo:** `C:\dev` — `@vibetech/workspace`
**Last verified against disk:** 2026-05-16
**Status:** COMPLETE. All binary success criteria are satisfied.

---

## 1. Mission

Convert `@vibetech/workspace` from a **24-app warehouse** into an **app-producing factory**:

- Every new monetizable app starts from `pnpm nx g @vibetech/factory:saas <name>` and is runnable in under 60 seconds.
- Every generated app ships with auth, Stripe billing, entitlements, transactional email, a landing page, and analytics — all wired by default.
- Shared packages own monetization logic; apps own their feature surface only.
- Time from "idea" to "first paying customer" drops from weeks to days.

This is Finisher Mode applied to the whole monorepo. **No net-new apps unless the factory produces them.** No factory work that does not unblock a real ship.

---

## 2. Ground truth (verified against `C:\dev` on 2026-05-15)

### 2.1 Stack actually in use

| Layer | Reality |
| --- | --- |
| Package manager | pnpm **10.33.0** (engines: `>=10.28.2`), hoisted, `shamefully-hoist=true` |
| Build orchestrator | Nx **22.7.1** (apps in `apps/`, libs in `packages/`), Nx Cloud enabled |
| Node | `>=22.0.0` |
| Language | TypeScript **5.9.3** (strict), Python 3.13, Rust stable |
| Frontend | React **19.2.4** + Vite **7.3.1** (SWC) + Tailwind **4.1.18** |
| Backend (SaaS donor) | **Fastify 5.8.4** + better-sqlite3 12.6.2 |
| Backend (others) | Express, Hono — mixed, per app |
| Desktop | **Tauri 2 AND Electron 33/35** — both in production, both stay |
| Mobile | Capacitor 8 + Expo SDK 54 / React Native 0.81 |
| Lint/format | ESLint 9 flat config + Biome 2.4.9 + Prettier 3.8.1 |
| Test | Vitest 4.1.2 + Playwright 1.58.2 + pytest |
| Release | Changesets + `nx release` (independent versioning) |

### 2.2 Where memory and reality diverge

These items in older guidance are wrong; ignore them:

- "pnpm 10.28.2 only" → actually 10.33.0 (engines: `>=10.28.2`).
- "Express 5 backend on port 5177" → the SaaS donor uses Fastify 5. Express is used in a few other apps only.
- "Electron forbidden" → `vibetech-command-center` (Electron 33, Tier 1) and `vibe-tutor` (Electron 35.7) are both shipping Electron. Tauri stays preferred for new desktop apps, Electron is **not** ripped out.
- "Next.js forbidden" → `vibe-shop` already ships Next.js 16.1.6. Do not migrate it; do not add Next to new apps.
- "VTDE deleted" → `TASKS.md` still lists "VTDE — Ship beta" as Active. State unresolved; do not assume deletion.

### 2.3 Donor app for factory extraction

`apps/invoice-automation-saas` is the **template source**. It already wires the entire monetization stack:

- **Auth:** `server/src/auth.ts` (3,996 bytes)
- **Billing:** `server/src/payments/`, `server/src/dunning/`, `stripe@22.1.0`, `@stripe/stripe-js@9.0.0`
- **Email:** `server/src/email/`, `resend@6.12.2`, `react-email@6.0.5`, `@react-email/components`, `@react-email/render`
- **Webhooks:** `svix@1.92.2`
- **Errors:** `@sentry/react@10.46.0`
- **Reliability:** `server/src/dlq.ts`, `server/src/audit.ts`, `server/src/security/`, `server/src/migrations/`
- **Stack:** Fastify 5 + better-sqlite3 12.6.2 + Vite 7 + React 19 + Tailwind 4

Every module to be extracted into a shared package already exists in working form. The factory is **80% extraction, 20% net-new.**

### 2.4 Existing assets the factory should reuse, not duplicate

| Asset | Role in factory |
| --- | --- |
| `@vibetech/feature-flags-{core,server,node,react,dashboard,python}` | **Entitlements layer.** Do not build a new one. |
| `@vibetech/ui` | Design system base for landing + app shells. |
| `@vibetech/openrouter-client` | AI usage primitive — feeds credit-based billing. |
| `@vibetech/db-app` | SQLite WAL adapter — backs auth + billing local state. |
| `@vibetech/shared-config` | Zod-validated env loader — every factory app uses it. |
| `@vibetech/service-common` | Middleware, security primitives — fold `audit.ts`, `dlq.ts` here. |
| `@vibetech/logger` | Structured JSON logging. |
| `@vibetech/testing-utils` | Shared fixtures + mocks for generated apps. |
| `apps/vibetech-command-center` | **Factory operations console.** Affected Intelligence + DB Explorer + Agent Orchestrator + Memory Viz already exist. Extend it; do not replace it. |
| `tools/active-project/` | Active-project lock (Finisher Mode). Already enforces "finish before starting another." Reuse. |

---

## 3. Success criteria (binary, verifiable)

- [x] **Six shared packages exist and are consumed by ≥2 apps each:**
  - [x] `@vibetech/auth` (extracted from `invoice-automation-saas/server/src/auth.ts`)
  - [x] `@vibetech/billing` (extracted from `payments/` + `dunning/`, Stripe 22 wrapper)
  - [x] `@vibetech/emails` (extracted from `email/`, Resend + react-email templates)
  - [x] `@vibetech/landing` (net new — React components: hero, pricing, FAQ, CTA, footer)
  - [x] `@vibetech/analytics` (net new — PostHog wrapper, opt-out by default for desktop)
  - [x] `@vibetech/entitlements` (thin wrapper over `@vibetech/feature-flags-server` for plan→feature mapping)
- [x] **`plugins/factory/` Nx plugin** exposes:
  - [x] `pnpm nx g @vibetech/factory:saas <name>` — produces buildable Vite+React+Fastify app in `apps/<name>` in under 60 seconds, with Stripe Checkout flow, login, landing page, and one gated route.
  - [x] `pnpm nx g @vibetech/factory:tauri-app <name>` — Tauri 2 desktop with license-key activation via `@vibetech/billing`.
  - [x] `pnpm nx g @vibetech/factory:landing-only <name>` — marketing-only site (no backend).
- [x] **`invoice-automation-saas` refactored** to consume the six packages with zero functional regression — proves the factory works on real shipping code.
- [x] **One new app generated end-to-end** via `nx g @vibetech/factory:saas` and deployed to production with a working Stripe Checkout in test mode.
- [x] **`vibetech-command-center` extended** with a "Factory" panel listing generated apps, their monetization status (Stripe connected, first revenue, MRR), and one-click generator launch.

### Completion proof

- Canonical generated SaaS baseline: `proposal-review-saas`
- Frontend production URL: `https://proposal-review-saas.vercel.app`
- Backend production URL: `https://proposal-review-api-production.up.railway.app`
- Vercel production deployment: `dpl_FrzsNH1GCGKuSgrt1Df2UMRJixsf`
- Railway backend deployment: `923fc203-d9b0-448a-b524-71ee46a51646`
- Railway persistent volume: `proposal-review-api-volume` mounted at `/data`
- Live proof: `POST /api/billing/pro-checkout` from the Vercel origin returns a Stripe test Checkout URL.

---

## 4. Architecture

### 4.1 New packages (build in this order)

```
packages/
  auth/              # @vibetech/auth      — extracts auth.ts; better-sqlite3-backed sessions
  billing/           # @vibetech/billing   — Stripe 22 wrapper, Checkout, customer portal, webhooks (Svix)
  entitlements/      # @vibetech/entitlements — thin layer over feature-flags-server: plan→feature mapping
  emails/            # @vibetech/emails    — Resend + react-email templates (welcome, receipt, password reset, dunning)
  landing/           # @vibetech/landing   — React components: hero, pricing, FAQ, CTA, footer (uses @vibetech/ui)
  analytics/         # @vibetech/analytics — PostHog wrapper, desktop opt-out default
```

### 4.2 Generator plugin

```
plugins/
  factory/                                   # new Nx plugin
    src/generators/
      saas/                                  # Vite + React 19 + Fastify 5 + better-sqlite3
        files/                               # template files with ___fileName___ tokens
        generator.ts
        schema.json
      tauri-app/                             # Tauri 2 + React 19 + Vite 7
      landing-only/                          # Vite + React 19, no backend
    src/index.ts
    package.json
    project.json
```

### 4.3 Monetization defaults baked into every `saas` generator output

- Free tier — rate-limited, entitlement-gated (uses `@vibetech/feature-flags-server`).
- Pro tier — monthly + annual via Stripe Price IDs.
- Optional credits/usage layer for AI-heavy apps (hooks into `@vibetech/openrouter-client`).
- Stripe Checkout + customer portal endpoints scaffolded.
- Resend transactional emails: welcome, receipt, password reset, dunning escalation.
- Runtime entitlement enforcement at the Fastify route level (decorator pattern).
- Landing page wired: hero, 3 features, pricing, FAQ, footer with legal stubs (`/terms`, `/privacy`).
- Sentry frontend + backend pre-wired with env-gated DSN.
- `.env.example` lists every required key with a comment explaining where to get it.

---

## 5. Execution phases

### Phase 0 — Audit (1 day, mostly `codex exec`)

**Output:** `C:\dev\docs\factory-audit.md`

- Inventory all 24 apps in `C:\dev\apps\`. For each, record:
  - Archetype: `web-saas` | `tauri-desktop` | `electron-desktop` | `mobile` | `mcp-server` | `experiment`
  - Ship status: `shipping` | `near-ship` | `polish-needed` | `broken` | `archive-candidate`
  - Monetization wiring: `full` (Stripe + auth + entitlements) | `partial` | `none`
- Cross-reference with `TASKS.md` and the active-project lock (`D:\active-project\active-project.json`) to identify which apps are blocking Finisher Mode.
- Recommend exactly one app as the **migration proof** for Phase 3. Default: `invoice-automation-saas`.

### Phase 1 — Extract shared packages from the donor (3–5 days)

Order is dependency-driven. After each package, run `pnpm nx test <package>` and `pnpm nx build <package>` before moving on.

1. **`@vibetech/auth`** — extract `apps/invoice-automation-saas/server/src/auth.ts`. SQLite session store via `@vibetech/db-app`. Email/password + magic link.
2. **`@vibetech/entitlements`** — thin wrapper over `@vibetech/feature-flags-server`. Plan ↔ feature mapping table, runtime check.
3. **`@vibetech/billing`** — extract `payments/` and `dunning/`. Stripe 22 wrapper. Checkout, customer portal, webhook handler. On webhook success → call `@vibetech/entitlements` to update plan.
4. **`@vibetech/emails`** — extract `email/`. Resend 6 + react-email 6. Templates: welcome, receipt, password reset, dunning (3 escalation levels).
5. **`@vibetech/landing`** — net new. Compose from `@vibetech/ui` + Radix primitives + Framer Motion. No deps on auth/billing.
6. **`@vibetech/analytics`** — net new. PostHog SDK wrapper. `init()` is a no-op on desktop builds unless explicit opt-in.

Backup before any destructive op:

```powershell
Compress-Archive -Path .\apps\invoice-automation-saas -DestinationPath .\_backups\Backup_invoice-saas_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
```

### Phase 2 — Build the factory plugin (2–3 days)

1. Scaffold: `pnpm nx g @nx/plugin:plugin factory --directory=plugins/factory`.
2. Implement `saas` generator: scaffold `apps/<name>/` cloning the `invoice-automation-saas` skeleton, replace all monetization wiring with imports from the six packages, write `.env.example` with every required key documented, generate Stripe Checkout routes, generate landing page from `@vibetech/landing`.
3. Implement `tauri-app` generator: same wiring, Tauri 2 shell, license activation flow uses `@vibetech/billing.activateLicense()`.
4. Implement `landing-only` generator: marketing-only site, no Fastify backend.
5. Test by generating `apps/__factory-smoke/` and running `pnpm nx dev __factory-smoke`. Delete after verification.

### Phase 3 — Migrate `invoice-automation-saas` onto the packages (2 days)

This is the validation gate. Replace the `server/src/auth.ts`, `payments/`, `dunning/`, `email/` modules with imports from the new packages. Run the existing test suite. Manual smoke test the Stripe Checkout flow. **Zero regression** is the bar — if the migration breaks anything, fix the packages, not the app.

### Phase 4 — Generate and ship one new app (2–3 days)

Pick the **lowest-friction monetizable idea** from the Phase 0 audit (a micro-tool, not another platform). Generate it via `nx g @vibetech/factory:saas`, add ~200 lines of feature code, deploy. Goal: under one week from `nx g` to a working Stripe Checkout link.

### Phase 5 — Extend the Command Center (1–2 days)

Add a "Factory" panel to `vibetech-command-center`:

- Lists every app generated by the factory (filter by `vibe-app.json` marker or generator tag).
- Shows monetization status: Stripe connected, first revenue date, MRR (queried from Stripe API).
- One-click generator launch (UI form → calls `pnpm nx g @vibetech/factory:saas <name>` via the existing Agent Orchestrator).
- Links to the app's local dev server and its Stripe dashboard.

---

## 6. Codex execution rules

- **Read both `AGENTS.md` and `CLAUDE.md` at session start.** They are the operational contract.
- **Use `codex exec`** for any task estimated >30 minutes. Keep the TUI for code review and pairing.
- **Use subagents** for Phase 1 — the six package extractions are independent, parallel is safe.
- **Use `--search` (live)** when researching Stripe API, Tauri 2, react-email, PostHog — these change fast.
- **MCP servers already registered** in `C:\dev\.mcp.json`. Use `rag_search` against the existing codebase before writing new code that may already exist (No Duplicates Rule from AGENTS.md).
- **Backup before any destructive op:**

  ```powershell
  Compress-Archive -Path .\<target> -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
  ```

- **Git rules** (from CLAUDE.md and recent incident history):
  - Verify `git branch --show-current`, `git status`, `git log origin/<branch>..<branch> --oneline` before commit/push.
  - Never `git commit --allow-empty` without confirming `git status` shows clean staging.
  - Quote stash refs: `"stash@{0}"`.
  - Feature branches only. Never push to `main`, `master`, or `develop`.
- **File size:** 500-line target, hard ceiling per AGENTS.md.
- **Active project lock:** the project for this work is `app-factory`. Set it via `pnpm run project:start app-factory` before starting Phase 1 (per `.claude/rules/active-project-lock.md`).

---

## 7. Refusal triggers — stop and ask

- Any request to commit to `main`, `master`, or `develop`.
- Any new app proposed that the factory could generate instead.
- Any file edit that would push a file past 600 lines.
- Any destructive operation without a prior `Compress-Archive` backup line in the same command.
- Any proposal to rip out Electron from `vibetech-command-center` or `vibe-tutor` — both are shipping; this goal does not block on a Tauri migration.

---

## 8. Kickoff

```powershell
cd C:\dev
pnpm run project:start app-factory
codex exec --sandbox workspace-write --search "Read GOAL_APP_FACTORY.md, AGENTS.md, and CLAUDE.md. Execute Phase 0. Output docs\factory-audit.md and stop for review."
```

After Phase 0 review:

```powershell
codex exec --sandbox workspace-write "Phase 1: extract @vibetech/auth from apps/invoice-automation-saas/server/src/auth.ts into packages/auth. TDD. Stop when package builds, tests pass, and invoice-automation-saas still builds against the local workspace package."
```

---

## 9. Open questions for Bruce before Phase 1 starts

1. **PostHog vs Plausible vs self-hosted Umami** for `@vibetech/analytics`? PostHog has feature flags built in (overlaps `@vibetech/feature-flags-*`); Plausible is privacy-first and lighter.
2. **Auth provider** for `@vibetech/auth`: keep the homegrown approach from `invoice-automation-saas/server/src/auth.ts`, or adopt `better-auth` / `lucia`?
3. **Active-project lock JSON path:** `D:\active-project\active-project.json` per memory — confirm before Phase 1 (verify the file exists and the schema matches `tools/active-project/_lib.ps1`).
4. **VTDE status:** `TASKS.md` says active beta, memory says deleted. Which is real? This decides whether the factory needs a `vtde-widget` archetype or not.
