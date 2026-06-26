# Monorepo Finisher — Launchable + Working + Maintainable

> Goal (Bruce, 2026-06-26): Get **every** project to "launches and everything works"
> (buttons, links, deferred TODOs/optimizations), delete dead/unused code, and make the
> monorepo **clean + heavily automated** so upkeep stops blocking fast product creation.
>
> Method: grounded in a 48-app read-only triage (2026-06-26) + the verified 63-finding
> workspace audit (2026-06-24, `docs/audits/workspace-audit-2026-06-24.md`).
> This file is the living tracker — check items off as they ship.

---

## Scoreboard (48 app dirs)

| Bucket | Count | Apps |
|---|---|---|
| **Launch today, ~0 work** | 21 | agent-engine, cme-track, crypto-enhanced, desktop-commander-v3, mcp-gateway, monorepo-health-mcp, nova-mobile-app, prior-auth-pro, proposal-review-saas, serenity-flow, skill-feedback-mcp, symptom-tracker-api, vibe-dental, vibe-portal, vibe-reminder, vibe-tech-marketing, vibe-tutor, vibe-tutor-mobile, vibetech-command-center, workspace-mcp-server, mcp-skills-server |
| **Launch but needs finishing** | 17 | ai-avatar-youtube-saas, learning-pipeline-mcp, memory-mcp, mcp-rag-server, nova-agent, vibe-blox, vibe-booking, vibe-booking-backend, vibe-booking-v2, vibe-chess, vibe-code-studio, vibe-discharge, vibe-invoice, vibe-justice, vibe-shipping, vibe-shop, vibe-tech-lovable |
| **Does NOT launch (blocking bug)** | 2 | proactive-recommendations-mcp (`__dirname` crash), vibe-reflection (missing `@vibetech/openrouter-client` methods) |
| **Dead — delete** | 1 | gravity-claw (empty/uninitialized submodule) |
| **Factory smoke fixtures (decision)** | 6 | _-factory-runtime-smoke, factory-landing-smoke, factory-saas-smoke, factory-tauri-smoke, factory-verify, test-factory-app |

Plus **36 packages** and **~12 backend services** (assessed in the audit, finished in Phase 4).

---

## Systemic findings (fix once, in shared layers — biggest leverage)

These repeat across many apps. Fixing them per-app is the slow path; fix the shared layer once.

1. **`x-plan` header paywall bypass** (5+ apps): vibe-discharge, vibe-booking-v2, proposal-review-saas, vibe-dental. Plan derived from a client header → any free user unlocks pro. → Derive plan only from server-side subscription in `@vibetech/entitlements`.
2. **Unsigned Stripe webhooks accepted when secret unset** (4+ apps): cme-track, vibe-portal, vibe-reminder, vibe-dental, vibe-discharge. Forged `checkout.session.completed` upgrades plans. → Shared billing helper rejects (503) when secret missing.
3. **Provider API keys shipped to the browser via `VITE_`**: vibe-tech-lovable (DeepSeek), vibe-code-studio (OpenRouter). → Route through backend proxy; never reference keys in client code.
4. **Unauthenticated PHI / tool-exec HTTP endpoints**: symptom-tracker-api (all PHI open), vibe-discharge `/api/simplify`, mcp-gateway `/call` (arbitrary tool exec), memory-mcp bridge, prompt-engineer apikey endpoint. → Auth + loopback bind + CORS allowlist.
5. **Route-ordering bugs make documented endpoints permanently dead**: vibe-blox rewards, backend/workflow-engine. → Register static routes before `/:id`.
6. **Duplication that drives drift**: OpenRouter client forked in 3 apps, AI model registry in 5 apps, SQLite boilerplate in 5+ modules, `SecureApiKeyManager` in 2, IPC protocol in 2 packages. Canonical shared packages already exist but are bypassed. → Consolidate.
7. **Tooling sprawl**: 100+ `scripts/`, 25 `tools/` dirs, a `monorepo-health` MCP, plus 3 autonomous-loop frameworks — and the `monorepo-maintenance` skill is a 1-word stub (`test`). No single maintenance entry point. → Consolidate (Phase 5).

---

## Phases & task lists

### Phase 0 — Safety & decisions (gate)

- [ ] **0.1 Rotate the committed Kimi/Moonshot key** — `apps/vibe-justice/backend/test_moonshot.py:4` (CRITICAL). Revoke at provider, switch to `os.getenv('KIMI_API_KEY')`, gitignore probe, scrub history. *(Provider revoke = Bruce; code change = me.)*
- [ ] **0.2 Campaign branch + D:\ snapshot** — `git checkout -b chore/monorepo-finisher`; `Save-Snapshot.ps1 -Tag "pre-finisher"`.
- [ ] **0.3 Resolve open decisions** (booking consolidation, smoke fixtures, execution mode — see bottom).

### Phase 1 — Unblock non-launchable + lead app (vibe-code-studio)

- [ ] **1.1 vibe-code-studio (finisher pass)** — remove `scripts/verify-app-working-v2.ps1`; fix `UnifiedAIService` hardcoded `moonshot/kimi-2.5-pro` to respect provider selection; replace mock `BackgroundAgentSystem` in `useAppServices.ts`; archive `docs/CONTINUATION-*.md`; resolve orphan `vscode-extension/`; route OpenRouter via backend proxy (drop `VITE_` key); delete dup `SecureApiKeyManager` fork; resolve TODOS.md deferrals (Monaco option ownership, Tauri capability hardening, docs-lint). Then `typecheck`/`lint`/`test` green + launch verify.
- [ ] **1.2 proactive-recommendations-mcp** — fix `__dirname` in ESM (`import.meta.url`), drop unused `params`, rebuild `dist/`, verify it starts.
- [ ] **1.3 vibe-reflection** — add `chatStream()` (models-array + SSE) and `tools`/`tool_choice` to `@vibetech/openrouter-client`; verify reflection loop. *(Fixes the shared package — also benefits other consumers.)*

### Phase 2 — Systemic security/correctness (fix-once)

- [ ] **2.1** Kill `x-plan` bypass via `@vibetech/entitlements` (server-side plan only) — vibe-discharge, vibe-booking-v2, proposal-review-saas, vibe-dental.
- [ ] **2.2** Reject unsigned Stripe webhooks (shared billing helper) — cme-track, vibe-portal, vibe-reminder, vibe-dental, vibe-discharge.
- [ ] **2.3** Auth PHI/clinical endpoints — symptom-tracker-api, vibe-discharge `/api/simplify`.
- [ ] **2.4** Remove `VITE_` provider keys; route via backend proxy — vibe-tech-lovable, vibe-code-studio.
- [ ] **2.5** Lock down unauth MCP HTTP endpoints (auth + loopback + CORS allowlist) — mcp-gateway `/call`, memory-mcp bridge, prompt-engineer apikey.
- [ ] **2.6** Fix command injection (`execFile`/allowlist) — learning-pipeline-mcp `generate_skill`.
- [ ] **2.7** Fix route-ordering dead endpoints — vibe-blox rewards, backend/workflow-engine.
- [ ] **2.8** Fix billing IDOR (use signed-cookie user id) — ai-avatar-youtube-saas.

### Phase 3 — Per-app finishing (launch + every button/link/TODO works)

**3A · SaaS factory scaffolds** — finish missing endpoints, replace legal/landing stubs, `ship:check` green:
- [ ] _-factory-runtime-smoke (missing `/api/pro/rewrite`) *(or delete per 0.3)*
- [ ] vibe-portal (legal stubs) · cme-track · vibe-dental · prior-auth-pro · proposal-review-saas · vibe-discharge · vibe-reminder · factory-verify *(template)*

**3B · Web apps** — wire buttons/links, replace placeholders/mocks:
- [ ] vibe-booking (alert() PDF stubs → real PDFs; fix `vite.config.mts` name `business-booking-platform-next`→`vibe-booking`; fix index.html title)
- [ ] vibe-booking-backend (Dashboard mock `INITIAL_APPOINTMENTS` → `/api/bookings`; remove dead BookingPortal demo; fix playwright port 4211)
- [ ] vibe-shop (run `db:generate`; reconcile AI-backend docs; implement/seed affiliate products; fix mock `affiliateLink:'#'`)
- [ ] vibe-shipping (Notes.tsx stub → real IndexedDB notes; Square dead path; placeholder wrangler/config)
- [ ] vibe-tech-lovable (fix vite proxy port 9001→3002; add `/api/blog`; implement/remove `SmartLeadEnricher`; fix `Preview.tsx` hardcoded localhost)
- [ ] vibe-blox (implement `/api/transactions/history`; align Shop `pending_cost`; finish admin bulk-approve UI; route-order fix from 2.7)
- [ ] vibe-chess (env wiring + verify) · serenity-flow (replace placeholder audio URLs) · vibe-tutor (drop dead scripts) · ai-avatar-youtube-saas (drop unused `ReadyPlayerMeAvatar`)

**3C · Desktop (Tauri/Electron)**:
- [ ] nova-agent (delete dead pages Dashboard/TradingTest/PalettePreview/Resources; consolidate NovaDashboard→2026; fix Moonshot `thinking` field leaking to all providers; env-ize hardcoded D:\ paths in Rust)
- [ ] vibe-justice (key already handled in 0.1; SSE streaming TODO; delete `backend/fluent_ui/`, `entry_point.py`, `launcher.py`)
- [ ] vibetech-command-center (verify launch + tests) · vibe-code-studio (polish carried from 1.1)

**3D · MCP servers**:
- [ ] memory-mcp (register 10 implemented-but-undeclared tools: cognitive/RAG/summarization/decay; fix `memory_learning_query` naming)
- [ ] mcp-rag-server (remove dead `test-fixtures/`; clarify index cold-start) · learning-pipeline-mcp (align analysis path constants) · mcp-skills-server (delete stale `DEPRECATED.md`) · workspace-mcp-server (fix dead `C:\dev` regex → `WORKSPACE_ROOT`)

**3E · Mobile**:
- [ ] vibe-tutor-mobile (verify) · nova-mobile-app (verify env/bridge)

### Phase 4 — Dead-code sweep & de-duplication

- [ ] **4.1** Delete confirmed dead code (per-app `deadCodeCandidates` from triage) — gated by "no importers" verification.
- [ ] **4.2** Consolidate OpenRouter client (vibe-tutor, vibe-justice, vibe-shop) → `@vibetech/openrouter-client` (+ thin transport adapters).
- [ ] **4.3** Consolidate AI model registry (nova-agent, vibe-code-studio, vibe-justice, vibe-tutor, vibe-shop) → one shared `ModelInfo` catalog (kills "demo mode" split-brain).
- [ ] **4.4** Route SQLite boilerplate (proactive-recommendations-mcp, skill-feedback-mcp, nova-database, agent-lats) → `@vibetech/db-app`.
- [ ] **4.5** Delete `SecureApiKeyManager` fork (vibe-code-studio); unify IPC protocol (`@vibetech/core` → `@vibetech/shared-ipc`); delete orphan `@vibetech/types/app-types.ts`.
- [ ] **4.6** crypto-enhanced: consolidate 25 utility scripts, archive 17 historical `.md`, add `.env.example`, fix broken hardcoded path in `analyze_trades.py`.
- [ ] **4.7** Backend services: fix lsp/dap UTF-8 framing, delete dead `workflow-engine/routes/*.js`, env-ize hardcoded `D:\` paths.

### Phase 5 — Maintenance automation (the actual goal)

- [ ] **5.1 One maintenance entry point** — `pnpm maintain` (and `:fix`) that runs health + dead-code scan + dep sync + path check + line-limit + db health and emits **one** report. Wrap existing scripts; don't add new overlapping ones.
- [ ] **5.2 Make `monorepo-maintenance` skill real** — replace the `test` stub with a skill that drives 5.1 and the dead-code-sweep workflow.
- [ ] **5.3 Script consolidation** — inventory `scripts/` (100+) + `tools/` (25), archive dead ones to `scripts/_archive/`, document the canonical ~15 in one README.
- [ ] **5.4 Scheduled health gate** — weekly GitHub Action: health + drift + dead-code report; opens an issue on regression. (Build on existing `nx affected` CI + `Register-SelfHealingTask.ps1`.)
- [ ] **5.5 `ship:check` everywhere** — a uniform per-app "launchable" smoke target so regressions are caught by `nx run-many -t ship:check`.
- [ ] **5.6 "New product fast" path** — document the factory → healthy-app flow so new apps start with zero debt (no new scaffolds become the next cleanup).

---

## Open decisions (Phase 0.3)

1. **Three booking apps** — vibe-booking (Vite SPA), vibe-booking-backend (Vite+Fastify SaaS), vibe-booking-v2 (Next.js). Which is canonical; retire the others?
2. **6 factory smoke fixtures + gravity-claw** — delete, or keep smoke fixtures as factory self-tests?
3. **Execution mode** — autonomous through phases (branch+PR per app), or pause for review per phase?

---

## Verification standard (every app, before checking it off)

`typecheck` + `lint` + unit tests green · launches via its `launchCommand` · all visible buttons/links do something real (no `alert()`/`href="#"`/empty `onClick`) · no placeholder/mock in production paths · no new dead code · diff-coverage gate satisfied (100% on changed lines).
