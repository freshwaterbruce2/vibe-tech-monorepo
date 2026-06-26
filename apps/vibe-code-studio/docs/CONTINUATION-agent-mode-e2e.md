# Continuation: Authenticated Agent-Mode E2E Harness

**Status as of 2026-06-20:** Agent mode is FIXED and proven at the API layer. Unit suite is
green (838 pass) and `typecheck:test` is green (0 errors). The remaining gap is **end-to-end UI
testing of agent mode**, which can't run today because the Playwright specs predate the auth gate.

## What's already done (don't redo)

- `scripts/routes/ai-proxy.js`: resolves keys from candidate env names (`KIMI_API_KEY` now works
  for the moonshot upstream), auth-gated, injects Bearer server-side.
- `src/services/ai/providers/BackendProxyService.ts`: mirrors `MoonshotService` for Kimi
  (fixed temperature 0.6/1.0 + `thinking:{type}`), robust `resolveProvider` aliases.
- `src/services/ai/ProviderAdapter.ts`: `validateConnection` delegates to the service `/health`.
- Tests: `src/__tests__/services/BackendProxyService.test.ts` + `aiProxyRoutes.test.ts` (19 tests).
- Live-verified: login → moonshot returns real content, openrouter returns content + SSE streams.

## The problem to solve

`tests/agent-mode-basic.spec.ts` and `tests/agent-mode-comprehensive.spec.ts` do `page.goto('/')`
and immediately expect `[data-testid="app-container"]` / `[data-testid="ai-chat"]`. But
`src/app/AppLayout.tsx` renders `<LandingPage>` when `!user` — so without authentication the specs
time out on the marketing page. They need: (1) the companion backend running on port 5004, and
(2) an authenticated browser session.

## Task

Make the agent-mode E2E specs run green against an authenticated session, exercising the real UI
buttons (open agent mode via Ctrl+Shift+A, type a task, run, see completion).

### Steps

1. **Backend for E2E.** Extend `playwright.config.ts` to also start the companion backend
   (`node scripts/backend-server.js`, port 5004) — either a second `webServer` entry or a
   `globalSetup` that spawns it and a `globalTeardown` that kills it. Confirm
   `GET http://localhost:5004/api/ai/health` returns `{ok:true}` before tests run. The web preview
   (`dev:web`, port 3001) already CORS-allows localhost origins with credentials.

2. **Auth via global-setup + storageState.** Add a Playwright `globalSetup` that:
   - POSTs `/api/auth/register` (fallback to `/api/auth/login` on 400) for a test user, e.g.
     `e2e@vibetech.local` / a fixed password, against `http://localhost:5004`.
   - Captures the `Set-Cookie` session cookie and writes a `storageState` JSON that includes that
     cookie for the `localhost:5004` (and `127.0.0.1:5004`) domain so credentialed AI calls from
     the 3001 origin carry it. Verify the cookie's SameSite=lax works cross-port on localhost; if
     the browser drops it, set `use.extraHTTPHeaders` or seed the cookie via
     `context.addCookies(...)` in a fixture instead.
   - Point `use.storageState` at that file so all specs start logged in. Confirm the app renders
     `[data-testid="app-container"]` (the editor) instead of the landing page.

3. **Decide AI strategy for E2E.** Either:
   - **Mock** the AI so tests are deterministic/free — there's a starter at
     `tests/mocks/deepseek-mock.ts`; intercept `**/api/ai/**` via `page.route` and return canned
     OpenAI-shaped completions; OR
   - **Live** calls (real KIMI/OPENROUTER env keys present) — slower, costs tokens, but truest.
   Recommend MOCK for CI determinism; keep one live smoke behind an env flag.

4. **Re-align stale selectors/assertions.** The specs reference `[data-testid="ai-chat"]`,
   `[data-testid="chat-input"]`, `[data-testid="step-status"]`, `text=Agent Mode`,
   `text=Task completed`, `AUTO-GENERATED`, etc. Verify these still match the current
   `EnhancedAgentMode` DOM (`src/components/EnhancedAgentMode/`); update selectors/assertions to
   the real component output. Do NOT weaken assertions — make them reflect actual behavior.

5. **Run:** `pnpm --filter vibe-code-studio test:e2e` (or `npx playwright test`). Iterate until the
   agent-mode specs pass. Also sanity-check `tests/basic.spec.ts`,
   `tests/cmd-k-inline-editing.spec.ts`, `tests/multi-file-approval.spec.ts` under the new auth setup.

### Guardrails

- Real env keys exist as `KIMI_API_KEY` + `OPENROUTER_API_KEY` (NO `.env` file; do not create one
  unless asked). `MOONSHOT_API_KEY`/`GOOGLE_API_KEY` are absent — the proxy aliases handle that.
- Default chat model is `moonshot/kimi-2.5-pro` → kimi-k2.5 (a thinking model; needs adequate
  `max_tokens` or reasoning eats the budget — use ≥256 in any live E2E assertion).
- Don't touch source to make tests pass; fix the harness/specs.

## Also-deferred (separate, pre-existing — not E2E)

`typecheck:build` (tsconfig.build.json) fails TS6306 "Referenced project must have composite:true"
for `packages/types`, `shared-ipc`, `feature-flags/sdk-node`, `landing`. This is monorepo
project-reference config debt, unrelated to vibe-code-studio tests. Fixing it means adding
`"composite": true` to those packages' tsconfigs (verify it doesn't break their own builds).
