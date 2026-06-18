# Factory Audit

Last updated: 2026-05-15
Scope: `V:\monorepo\apps\*`
Goal reference: `V:\monorepo\GOAL_APP_FACTORY.md`

## Executive summary

The workspace currently has 24 app folders under `apps/`. Only one app,
`invoice-automation-saas`, matches the target factory baseline closely enough to
serve as the extraction donor: it already has live Fastify + React + Stripe +
Resend + webhook + audit + dunning wiring in one place.

The factory direction is viable, but Phase 1 should not start untouched. Phase
0 found four concrete blockers:

1. The kickoff command in `GOAL_APP_FACTORY.md` is currently invalid:
   `pnpm run project:start app-factory` fails because
   `tools/active-project/start.ps1` only accepts names that exist under
   `apps/<project>`, and `apps/app-factory` does not exist.
2. The active-project lock file `D:\active-project\active-project.json` is
   absent, so there is no live lock state to cross-reference.
3. `TASKS.md` still lists `VTDE — Ship beta` and `Vibe Tutor — Release` as
   active, which conflicts with the goal brief's expectation that factory work
   becomes the active finisher lane.
4. `apps/ide-bridge` is effectively a ghost folder with only `dist/` and
   `tsconfig.tsbuildinfo`; it should not be treated as a viable app target.

Recommendation: use `invoice-automation-saas` as the Phase 3 migration proof,
and treat `shipping-pwa` and `business-booking-platform-next` as secondary
reference apps for auth/checkout patterns only, not as primary factory donors.

## Method

- Read the workspace and goal guardrails from `AGENTS.md`, `CLAUDE.md`,
  `AI.md`, and `.claude/agents/master-agent.md`.
- Verified live app folders with `Get-ChildItem V:\monorepo\apps -Directory`.
- Verified Nx-visible projects with `pnpm exec nx show projects`.
- Read current registry and task state from `WORKSPACE.json` and `TASKS.md`.
- Verified active-project lock behavior from `tools/active-project/_lib.ps1`
  and `tools/active-project/start.ps1`.
- Inspected candidate monetization apps via `package.json`, `project.json`, and
  focused grep over auth/payment/webhook/email paths.

## Blockers and drift

### 1. Active-project kickoff is broken as written

Observed command:

```powershell
pnpm run project:start app-factory
```

Observed result:

```text
ERROR: apps\app-factory does not exist.
Active project lock requires a real app under apps/.
```

Implication: before Phase 1, either the lock tool must accept non-app work
lanes like `app-factory`, or the factory effort needs an existing app name as
its lock owner.

### 2. Lock file missing

`D:\active-project\active-project.json` does not currently exist.

Implication: the "active-project lock" is policy, but not currently live state.
The factory plan cannot rely on it until the file is created.

### 3. Canonical active task list does not yet prioritize factory work

`TASKS.md` still marks these active:

- `VTDE — Ship beta`
- `Vibe Tutor — Release`

Implication: if factory work is now the top lane, `TASKS.md` needs to be
updated at the point the user wants the workspace's canonical task list changed.

### 4. Registry drift that matters to the factory plan

- `WORKSPACE.json` still describes `invoice-automation-saas` as
  `Next.js, Stripe`, but the live app is Vite + React + Fastify.
- `GOAL_APP_FACTORY.md` is correct to treat `invoice-automation-saas` as a
  Fastify donor and to reject the older Next.js framing.
- `TASKS.md` still treats VTDE as active, so the goal brief's "VTDE unresolved"
  note matches live disk state.

## Inventory

Classification rules used here:

- Archetype:
  `web-saas` | `tauri-desktop` | `electron-desktop` | `mobile` |
  `mcp-server` | `experiment`
- Ship status:
  `shipping` | `near-ship` | `polish-needed` | `broken` | `archive-candidate`
- Monetization wiring:
  `full` = auth + billing/checkouts + entitlement-like gating on live app paths
  in the app's current stack
  `partial` = some auth/billing wiring exists, but it is incomplete, provider-
  specific, or not at factory baseline
  `none` = no material monetization wiring found

| App | Archetype | Ship status | Monetization | Notes |
| --- | --- | --- | --- | --- |
| `agent-engine` | experiment | polish-needed | none | CLI/tooling app, not a monetizable product surface. |
| `business-booking-platform-next` | web-saas | near-ship | partial | Frontend shell is thin, backend has auth and booking checkout flows, but not factory-grade billing defaults. |
| `chessmaster-academy` | web-saas | polish-needed | none | Learning app with Express + Capacitor, no monetization wiring found. |
| `cross-agent-reflection` | web-saas | polish-needed | none | Full-stack app, but no billing/auth product stack beyond generic API usage. |
| `crypto-enhanced` | experiment | archive-candidate | none | Python trading service; observation-only domain, not a factory donor. |
| `desktop-commander-v3` | mcp-server | shipping | none | MCP server, not an app-factory target. |
| `gravity-claw` | experiment | polish-needed | none | Local-only WIP nested app, outside normal workspace release flow. |
| `ide-bridge` | experiment | archive-candidate | none | Ghost folder; only `dist/` and `tsconfig.tsbuildinfo` present. |
| `invoice-automation-saas` | web-saas | near-ship | full | Best donor: Fastify + Stripe + Resend + webhooks + audit + dunning + SQLite. |
| `mcp-gateway` | mcp-server | polish-needed | none | MCP infrastructure only. |
| `mcp-rag-server` | mcp-server | polish-needed | none | MCP infrastructure only. |
| `mcp-skills-server` | mcp-server | shipping | none | MCP infrastructure only. |
| `memory-mcp` | mcp-server | polish-needed | none | MCP infrastructure only. |
| `nova-agent` | tauri-desktop | shipping | none | Core desktop product, no factory-style billing stack. |
| `nova-mobile-app` | mobile | near-ship | none | Expo app, no monetization wiring found. |
| `prompt-engineer` | web-saas | shipping | none | Maintained full-stack app, but no billing stack found in current app. |
| `shipping-pwa` | web-saas | polish-needed | partial | Has auth, feature flags, and Square checkout flows, but not the Stripe/Fastify default factory stack. |
| `vibe-code-studio` | tauri-desktop | shipping | none | Desktop IDE/editor; not a monetization donor today. |
| `vibe-justice` | tauri-desktop | shipping | none | Tauri + Python legal app, no billing stack found. |
| `vibe-tech-lovable` | web-saas | shipping | none | Marketing site with pricing UI only; no real checkout/auth stack found. |
| `vibe-tutor` | electron-desktop | near-ship | none | Release lane still active, but no factory-style billing stack found. |
| `VibeBlox` | web-saas | polish-needed | none | Hono + React app, no auth/billing wiring found. |
| `vibetech-command-center` | electron-desktop | near-ship | none | Existing operations console; should host the future Factory panel. |
| `workspace-mcp-server` | mcp-server | polish-needed | none | MCP infrastructure only. |

## App count by lane

- `web-saas`: 8
- `tauri-desktop`: 3
- `electron-desktop`: 2
- `mobile`: 1
- `mcp-server`: 6
- `experiment`: 4

These counts sum to the canonical 24 app folders under `apps/`.

## Factory donor assessment

### Primary donor: `invoice-automation-saas`

Why it is the right extraction source:

- Live app package uses React 19 + Vite 7 + Fastify 5 + better-sqlite3.
- Stripe is present on both server and client:
  `stripe`, `@stripe/stripe-js`.
- Email stack is present:
  `resend`, `react-email`, `@react-email/components`,
  `@react-email/render`.
- Goal-named modules exist on disk:
  - `server/src/auth.ts`
  - `server/src/payments/stripeAdapter.ts`
  - `server/src/routes/paymentRoutes.ts`
  - `server/src/routes/webhookRoutes.ts`
  - `server/src/routes/dunningRoutes.ts`
  - `server/src/email/templates/PaymentReceipt.tsx`
  - `server/src/jobs/handlers/dunningSweep.ts`
- The app already has migrations, audit, and reliability surfaces:
  `server/src/migrations`, `server/src/audit.ts`, `server/src/dlq.ts`,
  `server/src/security`.

Factory implication: the six-package plan in `GOAL_APP_FACTORY.md` is aligned
with live code. This is an extraction problem, not a greenfield billing build.

### Secondary references

#### `shipping-pwa`

Useful for:

- Auth/session flows
- Upgrade CTA patterns
- Feature-flag usage
- Checkout/webhook handling shape

Not a donor for default factory wiring because:

- Uses Square, not Stripe
- Uses a different auth and deployment shape
- Has a much broader product surface than the desired minimal SaaS generator

#### `business-booking-platform-next`

Useful for:

- Protected checkout UX
- Auth route patterns
- Booking funnel framing

Not a donor for default factory wiring because:

- Frontend package is nearly empty
- Backend is Express-only and narrower than the factory target
- No evidence of a production-grade shared monetization stack

## Command-center readiness for the Factory panel

`vibetech-command-center` already has a panel-based renderer shell with live
panel components for:

- `AffectedDashboard`
- `DbExplorer`
- `AgentOrchestrator`
- `MemoryViz`

Factory implication: the correct move is to add another panel to the existing
renderer shell, not to build a second operations surface.

## Recommended migration proof

Use `invoice-automation-saas`.

Reasoning:

1. It already contains the exact auth/billing/email/webhook modules named in the
   factory brief.
2. It uses the target frontend/backend stack the factory wants to standardize.
3. Migrating it onto extracted packages is the strongest zero-regression proof
   available in the current workspace.
4. A weaker donor would force factory package design around hypothetical needs
   instead of proven live code.

## Recommended immediate next steps

1. Fix the active-project workflow mismatch before Phase 1:
   either extend `tools/active-project/start.ps1` to allow a non-app work lane
   like `app-factory`, or choose an existing app as the temporary lock owner.
2. Decide whether `TASKS.md` should be updated now to make factory work the
   active lane, or whether it remains a parallel meta-project during Phase 1.
3. Start extraction from `invoice-automation-saas` in this order:
   `auth`, `entitlements`, `billing`, `emails`, `landing`, `analytics`.
4. Keep `shipping-pwa` and `business-booking-platform-next` as comparison apps
   for auth/checkout ergonomics, not as primary code donors.

## Recommendation

Proceed to Phase 1 only after acknowledging the lock-tool mismatch. The factory
mission is technically well-founded, but the current repo workflow still treats
it as a non-project lane, while the active-project tooling only knows how to
lock concrete app folders.
