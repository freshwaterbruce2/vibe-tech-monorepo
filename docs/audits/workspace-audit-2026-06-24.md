# VibeTech Monorepo Audit — Prioritized Report

Date: 2026-06-24
Severity counts after dedup: Critical 1 · High 19 · Medium 26 · Low 17 (63 total)

> Method: multi-agent read-only audit (38 agents). 11 code-cluster auditors (apps + packages)
> plus 4 dimension auditors (build-health, tech-debt metrics, security/paths, duplication).
> Every critical/high finding was adversarially verified by an independent agent that opened
> the file and tried to refute it (2 findings refuted and dropped). Medium/low are unverified.

---

## Executive Summary

The audit found 1 critical, 19 high, 26 medium, and 17 low issues. The single most urgent item is a **live Moonshot/Kimi API key committed to a tracked source file** (`apps/vibe-justice/backend/test_moonshot.py`) — rotate it immediately. Beyond that, the high-severity set clusters into three themes: **(1) access-control / credential exposure** — unauthenticated PHI/clinical endpoints, billing IDOR, and provider API keys shipped to the browser via `VITE_` env vars; **(2) a systemic paywall bypass** where entitlements are derived from a client-controlled `x-plan` header (5+ apps) and unsigned Stripe webhooks upgrade plans (4+ apps); and **(3) broken correctness/availability** — route-ordering bugs that make documented endpoints permanently unreachable, and a fully dead Square payment path in vibe-shipping. Medium/low findings are dominated by duplication (OpenRouter clients, model registries, db boilerplate) and path-policy drift (hardcoded `D:\` paths). The good news: most highs are in generated demo/SaaS scaffolds with limited blast radius, and the recurring patterns can be fixed once in shared layers.

---

## Top Priorities (fix in this order)

1. **Rotate the committed Kimi/Moonshot key — CRITICAL**
   - Project: vibe-justice · `apps/vibe-justice/backend/test_moonshot.py:4`
   - Why: A real, non-placeholder Bearer secret (`sk-…` REDACTED) is committed and tracked (not gitignored, in history since commit d639550a). Anyone with repo access has a working key.
   - Fix: Revoke/rotate at the provider now. Replace literal with `os.getenv('KIMI_API_KEY')`, scrub history (BFG/filter-repo), gitignore the probe script.

2. **Kill the systemic `x-plan` paywall bypass (shared fix)**
   - Projects/files: vibe-discharge `server/src/index.ts:343,427`; vibe-booking-v2 `server/src/routes.ts:59-90`; proposal-review-saas `server/src/index.ts:111,156`; (pattern also in vibe-dental).
   - Why: Any authenticated free user sends `x-plan: pro` (or `business`) to unlock gated/paid features; one app even defaults cookie sessions to `pro`. Authorization-by-client-input (CWE-639/602).
   - Fix: Derive plan only from server-side subscription state (`getActiveSubscriptionForEmail`). Remove the header fallback or gate it behind a non-production test flag. Consolidate into the shared `@vibetech/entitlements` layer so apps can't reintroduce header-trust.

3. **Authenticate the unauthenticated PHI/clinical endpoints**
   - symptom-tracker-api `src/routes.ts:40-273` (all people/symptom CRUD open, DELETE not even person-scoped); vibe-discharge `server/src/index.ts:476-511` (`/api/simplify` forwards patient discharge text to an external AI provider with no auth).
   - Why: Health data (symptoms, free-text notes, clinical instructions) is fully readable/modifiable/deletable or an open AI-cost/PHI-egress sink. Worse when bound to `0.0.0.0`/LAN as documented.
   - Fix: Add session/JWT auth middleware on the `/api` router; scope every query to the authenticated user; return 401 when absent.

4. **Lock down the MCP gateway HTTP `/call` endpoint**
   - mcp-gateway `apps/mcp-gateway/src/http-api.ts:37-43,51,113,136`
   - Why: Default deployment has **no auth** (`if (!apiKey) return true`), wildcard CORS, binds `0.0.0.0`, and `/call` executes _any_ tool on _any_ downstream server — including `filesystem`, `sqlite`, and `desktop-commander` (arbitrary OS command execution). Any local web page or LAN host can drive it.
   - Fix: Fail closed — require `GATEWAY_API_KEY` to start `/call`, bind `127.0.0.1`, replace `*` CORS with an explicit allowlist.

5. **Fix command injection in learning-pipeline-mcp `generate_skill`**
   - learning-pipeline-mcp `src/index.ts:128-132`
   - Why: Caller-supplied `patternName` is interpolated raw into a PowerShell command passed to `child_process.exec` (shell). A `"` plus `&`/`;`/`$(...)` executes arbitrary commands.
   - Fix: Use `execFile('powershell.exe', [...argv])` (no shell), or allowlist `patternName` to `/^[A-Za-z0-9_-]+$/`.

6. **Stop shipping provider API keys to the browser (`VITE_` keys)**
   - vibe-tech-lovable `src/services/ai.ts:12-42` (DeepSeek key inlined into client bundle, sourcemaps on); vibe-code-studio `src/services/ai/providers/OpenRouterService.ts:21,62-67` (OpenRouter key path, bypasses the app's own documented server proxy).
   - Why: Any `VITE_`-prefixed var is statically inlined into the distributed bundle → key theft, quota/billing abuse.
   - Fix: Route AI calls through the existing backend proxy; never reference provider keys in client code.

7. **Fix route-ordering bugs making documented endpoints dead**
   - vibe-blox `server/routes/rewards.ts` (`/:id` at 44 shadows `/pending`,`/history`,`/stats`); workflow-engine `backend/workflow-engine/src/server.js` (`/:id` at 356 shadows `/active`,`/history`).
   - Why: Parametric route registered before static routes → parent dashboards, history, and stats endpoints return 400/404 and can never execute.
   - Fix: Register static routes before the parametric `/:id` route.

8. **Repair the dead Square payment path (vibe-shipping)**
   - `server/routes/payment.ts:88-98` (signature verified without the signing key → always `false`, every webhook 401s) + `src/services/squarePaymentService.ts:254-280` (handlers are console.warn stubs).
   - Why: No payment can ever activate a subscription; even fixed, handlers do nothing. Stub money-path violates no-mock rule.
   - Fix: Pass `SQUARE_WEBHOOK_SIGNATURE_KEY`, implement Square's real base64 HMAC-SHA256 scheme over raw bytes, and implement real tenant activation.

---

## Critical

### vibe-justice

- **Live Moonshot/Kimi API key hardcoded in tracked source** — `apps/vibe-justice/backend/test_moonshot.py:4`. Real `sk-…` Bearer secret committed, not gitignored, present in history (commit d639550a). Rotate at provider, switch to `os.getenv('KIMI_API_KEY')`, scrub history.

---

## High

### mcp-gateway

- **Unauthenticated HTTP `/call` with wildcard CORS, binds all interfaces** — `apps/mcp-gateway/src/http-api.ts:37-43,51,113,136`. `checkAuth` passes when `GATEWAY_API_KEY` is unset (the default); `/call` runs arbitrary tools on any downstream server (filesystem/sqlite/desktop-commander). Fail closed, bind loopback, allowlist CORS.

### learning-pipeline-mcp

- **Command injection via `patternName`** — `src/index.ts:128-132`. Raw interpolation into a PowerShell string passed to `exec`. Use `execFile` argv / allowlist regex.

### vibe-code-studio

- **OpenRouter key shippable in client bundle; documented server proxy bypassed** — `src/services/ai/providers/OpenRouterService.ts:21,62-67,276-297`. Renderer reads `VITE_OPENROUTER_API_KEY` and POSTs directly to OpenRouter; the auth-gated `/api/ai/*` proxy is never called from `src/`. Route through the backend proxy; drop the VITE\_ key path.

### symptom-tracker-api

- **All PHI endpoints unauthenticated** — `src/routes.ts:40-273` (and `server.ts:15`). People + symptom CRUD fully open; `DELETE /symptoms/:id` not person-scoped; no tenant isolation. Add auth middleware and per-user scoping.

### vibe-discharge

- **`/api/simplify` forwards patient PHI to external AI with no auth** — `server/src/index.ts:476-511`. Unlike every other route, no `requireAuth`. Add auth + plan gating.
- **`x-plan` header entitlement bypass** — `server/src/index.ts:343,427` (cf. `/api/pro:130`). `resolveGeneratedPlan(req.headers['x-plan'])` trusts the client. Derive plan from DB subscription only.

### vibe-shipping

- **Square webhook signature always bypassed** — `server/routes/payment.ts:88-98`. `verifyWebhookSignature(body, signature)` omits the key arg → returns `false` unconditionally; scheme also doesn't match Square's real HMAC. Every webhook 401s; pass the key and implement the correct scheme.
- **Square webhook handlers are non-functional stubs** — `src/services/squarePaymentService.ts:254-280`. console.warn-only; no subscription/tenant ever activated. Implement real activation or stop advertising the feature.
- **Tenant impersonation via `?tenantId` (no env guard)** — `src/middleware/tenant.middleware.ts:67-70` (live path also `server/middleware/index.ts:45-48`). "Method 4" resolves any tenant from a query param with no auth and no `NODE_ENV` gate. Remove or gate to non-production.

### vibe-booking-v2

- **`x-plan` header paywall bypass** — `server/src/routes.ts:59-90`. Header takes precedence over stored plan (`planHeader ?? traveler.plan`); cookie branch defaults to `pro`. Derive plan from persisted record only.

### ai-avatar-youtube-saas

- **Billing actions trust client-supplied `userId` (IDOR)** — `src/app/actions/billing.ts:14-66`. `createCheckoutSessionAction`/`createPortalSessionAction` accept `userId` with no authz; an attacker can get another customer's Stripe portal URL. Use `getBillingUserId()` from the signed cookie; ignore client-passed id.

### vibe-tech-lovable

- **DeepSeek API key shipped to browser via `VITE_DEEPSEEK_API_KEY`** — `src/services/ai.ts:12-42`. Inlined into the client SPA bundle (sourcemaps on). Proxy through `backend/server.mjs`; drop the VITE\_ prefix.
- **Railway healthcheck path `/health` doesn't exist (restart loop)** — `railway.json:11` vs `backend/server.mjs` (only `/api/health`). Non-2xx healthcheck + `ON_FAILURE` → deploy never healthy. Change to `/api/health` or add a `/health` route.

### vibe-blox

- **`/:id` route shadows `/pending`, `/history`, `/stats`** — `server/routes/rewards.ts:44` before `144/352/389`. Parent pending/history/stats endpoints are dead (Hono matches in registration order; verified empirically). Register static routes before `/:id`.

### feature-flags

- **sdk-node missing `not_in_list`/`not_contains` → fail-open entitlement bypass** — `packages/feature-flags/sdk-node/src/client.ts:304-319`. The deny-fallback rule (`not_in_list`, `enabled:false`) emitted by `@vibetech/entitlements` falls through to `default:return false`, so local evaluation lands on "Default to enabled" and grants the feature the server would deny (on cache-fallback / sync paths). Mirror the server operators; better, share one rule evaluator in `@vibetech/feature-flags-core`.

### backend/workflow-engine

- **`/api/workflows/active` and `/history` unreachable (route ordering)** — `src/server.js:356` (`/:id`) before `401`/`421`. Both advertised endpoints return 400. Register static routes first.

### vibe-tutor / vibe-justice / vibe-shop (duplication)

- **OpenRouter client + chat types re-implemented per app** — canonical `packages/openrouter-client/src/index.ts` exists and is used by vibe-reflection/nova-agent, but `apps/vibe-tutor/src/services/openrouter.ts`, `apps/vibe-justice/frontend/src/services/openrouter.ts`, `apps/vibe-shop/src/services/ai/openrouter.ts` each fork it (types already drifted; vibe-tutor even declares the shared dep but ignores it). Consolidate onto the shared client with thin per-transport adapters (Capacitor, direct-key).

---

## Medium

### workspace-mcp-server

- **Custom-server detection regex matches dead `C:\dev` path** — `src/loaders.ts:138-139`. Real `.mcp.json` uses `V:/monorepo/...`, so `isCustom` is always false and `ws_workspace_summary` reports the inverse of reality. Match `WORKSPACE_ROOT` instead.
- **Connection strings (DATABASE_URL/Postgres) not masked** — `src/constants.ts:51-58`. `isSensitive()` is name-only, so `postgres://user:PASSWORD@host/db` values are emitted unmasked. Add value-based credential-URL detection.

### memory-mcp

- **HTTP bridge binds all interfaces, open CORS, no auth, executes arbitrary tool calls** — `src/index.ts:249-327`. Exposes full memory/learning/RAG mutation surface to any local page/host. Bind `127.0.0.1`, restrict CORS, require a loopback token, gate behind an opt-in flag.

### prompt-engineer

- **Unauthenticated mutable API-key endpoint + wildcard CORS** — `server/index.ts:17,96-104`. `POST /api/settings/apikey` overwrites `OPENROUTER_API_KEY` from any origin. Restrict CORS to the dev origin, bind loopback, remove/token-protect the endpoint.

### nova-agent

- **Moonshot-only `thinking` field sent to all OpenAI-compatible providers** — `src-tauri/src/modules/llm/provider.rs:80-83`. Always `Some(...)`, so it ships to OpenRouter/DeepSeek/Groq/Ollama and can cause 400s; hardcoded `temperature:0.6` likewise. Only set for Kimi.
- **Hardcoded D:\ DB paths with no env override** — `prompts.rs:6-7` (`DB_PATH`/`LEGACY_DB_PATH`) and `pattern_engine.rs:108` (admitted "quick fix"). Read from `DATABASE_PATH`/`NOVA_DATABASE_PATH` with the D:\ value as default, matching `state.rs`.

### vibe-code-studio

- **Unauthenticated OpenRouter dev proxy with wildcard CORS is the wired AI path; duplicates the hardened proxy** — `scripts/openrouter-proxy.js:38,88-97`. Renderer targets this insecure proxy while the session-gated `scripts/routes/ai-proxy.js` is never called. Consolidate onto the auth-gated proxy.

### vibe-discharge

- **Mock AI clinical output served in production when no key set** — `server/src/index.ts:455-474`. `getAiProvider()` returns canned "Mocked Gemini Output" patient instructions. Return 503 "AI not configured" instead.

### cme-track / vibe-dental / vibe-discharge / vibe-portal / vibe-reminder

- **Stripe webhook accepts unsigned payloads when secret unset → forged plan upgrades** — cme-track `server/src/index.ts:214-251,137-185`; vibe-portal `server/src/index.ts:252-268`; vibe-reminder `server/src/index.ts:317-347`; same pattern in vibe-dental/vibe-discharge. `allowUnsigned: !webhookSecret` lets a forged `checkout.session.completed` set `plan_id='pro'`. Refuse (503) when the secret is missing; only allow unsigned behind an explicit non-prod flag. (Systemic — fix once.)

### proposal-review-saas

- **`x-plan` header bypass + unauthenticated `/api/review`** — `server/src/index.ts:111,156,88-101`. Same header-trust pattern; the analysis endpoint has no auth. Server-side plan lookup + auth on `/api/review`.

### vibe-reminder

- **Unauthenticated appointment CRUD + reminder dispatch (spoofable `x-tenant-id`)** — `server/src/index.ts:151-204,404-407`. No `requireGeneratedAuth`; tenant from client header (defaults `demo-clinic`); `/api/reminders/run` triggers real Twilio/Resend sends. Gate with auth; derive tenant from session.

### vibe-blox

- **Reward approval mutates balance + status + activity without a transaction** — `server/routes/rewards.ts:239-272`. Three independent `.run()` calls; partial failure corrupts the coin economy. Wrap in `db.transaction()` like `/award` (transactions.ts:40).

### vibe-booking-backend

- **Booking marked paid + confirmed with no charge via `/api/payments/create`** — `server/src/paymentRoutes.ts:26-72`. Self-confirm endpoint sets `status:'succeeded'` + `confirmBookingPayment` with no provider charge, not test-gated. Remove or gate to test-only; rely on the Stripe webhook path.

### vibe-tech-lovable

- **Production backend is in-memory but advertises SQLite-on-D: persistence** — `backend/server.mjs:10-15,70-82`. All CRM/invoice data lost on restart; health reports a phantom DB path. Wire a real store or correct the health/docs.

### ai-avatar-youtube-saas

- **`AUTH_SECRET`/`DPOP_SECRET` default to a public placeholder that passes validation** — `src/lib/env.ts:23-24`. `.default('change-me-min-32-characters-long')` (>=32 chars) lets deploys run with a source-visible secret signing cookies/DPoP and encrypting OAuth tokens. Fail closed in production (no default / superRefine).

### @vibetech/core + @vibetech/shared-ipc (duplication)

- **Two parallel, incompatible IPC protocol implementations** — `packages/core/src/shared/ipc/messages.ts:7-100` (loose, `any`) vs `packages/shared-ipc/src/schemas.ts` (Zod discriminated union, source of truth). Both consumed widely; enums drift. Re-export from shared-ipc and delete the hand-rolled validator.

### @vibetech/core (dead/stub)

- **`CrossAppPatternTracker` is an exported placeholder** — `packages/core/src/shared/database/LearningDatabase.ts:107-130`. `recordPattern()` empty, `getSuggestedPatterns()` returns `[]`; no live callers. Implement against the passed-in interface or remove from public exports.

### agent-lats

- **Non-null-assertion regex false-positives on every `!=`/`!==`** — `packages/agent-lats/src/critique.ts:76,168-178`. Biases the quality signal feeding MCTS/blame downward. Tighten regex to exclude `!=`/`!==`/`!(`.

### packages/vcs-theme

- **package.json points main/types/exports at empty `dist/`** — `package.json:7-21`. `import '@vibetech/vcs-theme'` fails to resolve until built (no consumers yet, latent). Build via tsup or point `.`/`./css` at `src` like `./tokens`.

### backend/openrouter-proxy

- **Streaming requests always record cost = 0** — `src/routes/openrouter.ts:137,437-449`. `calculateCost` only reads prompt/completion tokens, but streaming supplies only `total_tokens`. Capture per-direction tokens from the final usage chunk.

### packages/backend & backend

- **Hardcoded D:\ paths with no env var** — `packages/backend/src/services/EmbeddingService.ts:5` (`'D:/vibe-tech/ai-models'`, dup in vectorstore-diagnostic.ts:21); `backend/server.js:18-21` (writes to non-canonical `D:\vibe-tech-data\vibetech.db`, no `DATABASE_PATH`). Resolve via env / shared path registry; use `D:\databases\`.

### Cross-app (duplication)

- **better-sqlite3 connection boilerplate copy-pasted across 5+ modules** — canonical `packages/db-app/src/index.ts` exists, but proactive-recommendations-mcp `src/index.ts:22`, skill-feedback-mcp (byte-identical `getDb()` + `LEARNING_DB_PATH` default), nova-database, agent-lats each re-roll `new Database` + WAL + busy_timeout without the path-segregation guard. Route through `@vibetech/db-app`.
- **Competing AI model registries with divergent shapes** — nova-agent `src/components/models-config.ts:24`, vibe-code-studio `ModelRegistry`, vibe-justice `LEGAL_MODELS`, vibe-tutor `MODELS`, vibe-shop. Model ids/pricing drift independently (the documented "demo mode" split-brain). Own one `ModelInfo`/catalog in a shared package.
- **`SecureApiKeyManager` (+ `API_KEY_PATTERNS` validation regexes) forked into vibe-code-studio** — canonical `packages/core/src/utils/security/SecureApiKeyManager.ts` vs `apps/vibe-code-studio/src/utils/SecureApiKeyManager.ts`. Security-sensitive key-format regexes duplicated. Delete the fork; import the canonical version with an injected logger.

### crypto-enhanced (tech-debt)

- **`trading_engine.py` (1858 lines) and `websocket_manager.py` (1067 lines) exceed the 1000-line hard cap** in active financial paths. Any future edit is pre-commit-blocked. Human-reviewed module split required (financial-safety rule).

---

## Low

### @vibetech/auth

- **`getUserById` silently drops `isAdmin`** — `packages/auth/src/index.ts:155-182`. SELECT omits `is_admin` (unlike `rowToUser` in store.ts). Latent footgun (no current behavior-affecting consumer reads it via this path). Add `is_admin` to the SELECT for consistency.

### mcp-gateway

- **`getClient` spawn race double-spawns + leaks a transport** — `src/mcp-client.ts:21-47`. No in-flight promise cache. Cache `Map<string, Promise<Client>>`.

### nova-agent

- **Logs first 8 chars of API key to tracing** — `src-tauri/src/modules/llm/provider.rs:363-366`. Remove the key-prefix log; log `key_present` boolean instead.

### vibe-code-studio

- **Vite dev server and OpenRouter proxy both claim port 3001** — `package.json:23`. EADDRINUSE / AI requests hit Vite. Move one port.
- **Dead hook `useMarkdown.ts` (no importers)** — `src/hooks/useMarkdown.ts`. Delete after confirming no dynamic import.

### memory-mcp

- **`rag-bridge.ts` deep-imports nova-agent source across app boundary** — `src/rag-bridge.ts:9-14` (`../../nova-agent/src/rag/*.js`). Extract to a shared `packages/rag`.

### ai-avatar-youtube-saas

- **`Avatar3D` onCreated cleanup ignored by R3F (listener leak)** — `src/components/avatar/Avatar3D.tsx:72-79`. Register `webglcontextlost` in a `useEffect` via `useThree`.

### vibe-dental

- **PHI tables (patients/appointments) created but no endpoints** — `server/src/index.ts:56-108`. Dead schema or unbuilt feature advertised as working. Implement gated CRUD or remove schema.

### serenity-flow

- **Journal PIN lock is cosmetic (plaintext PIN, client-side check)** — `src/components/JournalSecure.tsx:48-57,161-172`. Entries load regardless of PIN; PIN stored plaintext in Firestore. Hash + verify server-side or drop the "secure" framing.

### vibe-blox

- **Reward purchase dereferences `userCoins` without null check** — `server/routes/rewards.ts:93-97`. Deleted account with valid token → TypeError/500 instead of 404. Type `| undefined` and guard.

### vibe-shipping

- **Commented-out stub import + TODO in SW registration** — `src/sw-registration.ts:3`. Remove dead `pwaMetrics` scaffolding or implement it.

### vibe-justice

- **Deferred SSE-streaming TODOs; `generate_response_streaming` doesn't stream** — `backend/vibe_justice/services/ai_service.py:266,440`. Implement SSE or rename the method.

### openrouter-client

- **Retries non-retryable 4xx (401/400/422) same as 5xx/network** — `packages/openrouter-client/src/index.ts:88-108`. Guard retry on `error.code`/status 429/>=500; consider exponential backoff.

### openclaw-bridge

- **"Exponential backoff" is actually linear, capped at 5x** — `packages/openclaw-bridge/src/index.ts:219`. Use `pow(2, …)` or fix the comment.

### agent-lats

- **Pipeline "success rate" predictor is order-invariant (ranking no-op)** — `packages/pipeline-evolution.ts:417-430,461-535`. `delta = rate - baselineRate` is structurally ~0, so the headline metric never fires; only the fail-fast tiebreaker does anything. Make the model order-sensitive or drop the dimension.

### backend/lsp-proxy + backend/dap-proxy

- **Content-Length (bytes) sliced from a UTF-16 string** — lsp `src/index.js:110-131`, dap `src/index.js:106-133`. Multibyte UTF-8 desyncs framing. Buffer as `Buffer` and slice by byte offset.

### backend/workflow-engine

- **`routes/*.js` are a dead, divergent duplicate of the inline routes in `server.js`** (`workflow.routes.js:34,62,76`, same ordering bug). Delete the orphaned copy or wire it in.

### @vibetech/types

- **`app-types.ts` is orphaned dead code duplicating vibe-tutor's local types** — `packages/types/src/app-types.ts`. Not exported from index; vibe-tutor doesn't depend on the package. Delete or export-and-migrate.

### @vibetech/core

- **`AgentLearningRAG.getDbSizeMB()` stats the default path, not the opened DB** — `packages/core/src/shared/intelligence/AgentLearningRAG.ts:335-338`. Store `this.resolvedPath` and stat that.

---

## Themes & Systemic Issues

- **Client-trusted entitlements (paywall bypass) — the biggest systemic security pattern.** The `x-plan` header is trusted in 5+ apps (vibe-discharge, vibe-booking-v2, proposal-review-saas, vibe-dental) and unsigned Stripe webhooks upgrade plans in 4+ apps (cme-track, vibe-portal, vibe-reminder, vibe-dental, vibe-discharge). These almost certainly share a generated SaaS scaffold. Fix once in `@vibetech/entitlements`/billing: plan from server-side subscription only, webhooks reject when the secret is unset.
- **Provider keys / unauthenticated AI sinks.** A committed Kimi key (critical), two `VITE_` provider keys in client bundles (vibe-tech-lovable, vibe-code-studio), and multiple unauthenticated key-mutating or tool-executing endpoints with wildcard CORS (mcp-gateway, memory-mcp, prompt-engineer, openrouter-proxy). Standardize on backend-held keys + auth-gated proxies; never expose keys via `import.meta.env` VITE\_ vars.
- **Unauthenticated PHI/clinical endpoints.** symptom-tracker-api, vibe-discharge `/api/simplify`, and vibe-dental's dead PHI tables show health-data features shipped without auth/tenant isolation — high regulatory/privacy risk, especially in the documented LAN-bind modes.
- **Route-ordering bug cluster.** Identical `/:id`-before-static-route defects break documented endpoints in vibe-blox (Hono) and workflow-engine (Express), plus the duplicated dead workflow-engine routes file. Add a lint/convention: register static routes before parametric ones.
- **Duplication everywhere.** OpenRouter clients (3 apps), AI model registries (5 apps), better-sqlite3 connection boilerplate (5+ modules), `SecureApiKeyManager` (2 copies), IPC protocol (2 packages), and orphaned type packages. Canonical shared packages already exist (`@vibetech/openrouter-client`, `@vibetech/db-app`, `@vibetech/core`, `@vibetech/shared-ipc`) but are bypassed — consolidate to stop security/behavior drift.
- **Path-policy drift.** Hardcoded `D:\` paths without env vars (nova-agent prompts.rs/pattern_engine.rs, packages/backend, backend/server.js) and a bypassable `assertSafeDatabasePath` guard (`packages/db-app/src/index.ts`) undercut the workspace's own "code on V:, data on D:, env-var-only" rule.
- **Stub/mock-in-production violations.** vibe-shipping Square handlers, vibe-discharge mock clinical output, `CrossAppPatternTracker` — placeholder logic shipped in production money/clinical/shared paths, contrary to the no-mock rule.
