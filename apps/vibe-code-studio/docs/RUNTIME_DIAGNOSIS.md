# Vibe Code Studio — Runtime Diagnosis (Wave 0)

**Date:** 2026-07-15  
**Scope:** Why chat / agent / desktop AI stop working; live probe of sidecar + auth + keys.  
**App path:** `apps/vibe-code-studio` · Install: `V:\Apps\Vibe_Code_Studio\vibe-code-studio.exe`

---

## Executive summary

Chat and agent mode do **not** call models from the renderer. They go through:

`UnifiedAIService` → `BackendProxyService` → **`http://127.0.0.1:5004/api/ai/...`** (session cookie required).

On this machine at diagnosis time:

| Check                             | Result                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| Sidecar on :5004                  | **Down** until started manually (`node scripts/backend-server.js`)       |
| Provider keys (machine env)       | OpenRouter + Kimi present → `/api/ai/health` reports all configured      |
| AI completion with session cookie | **Works** (OpenRouter `deepseek/deepseek-chat` returned content)         |
| AI without session cookie         | **401** `Unauthorized. Sign in to use AI.`                               |
| Local DB users                    | All `subscription_tier: free` → client free-plan **10 message** wall     |
| Packaged backend binary           | Present but **stale (2026-04-21)** vs active `scripts/backend-server.js` |

**Primary cause:** backend sidecar not running (or auth cookie not attached).  
**Secondary:** free-plan limits on desktop, dual agent UIs, stale packaging.

---

## Critical path

```text
AIChat / useAIChat
  → UnifiedAIService.sendContextualMessageStream
  → AIProviderFactory (VITE_USE_AI_PROXY default ON)
  → BackendProxyService  baseUrl = http://localhost:5004/api/ai
  → sidecar registerAiProxyRoutes
       1) getSessionUser (cookie invoiceflow_session)
       2) resolveUpstreamKey (OPENROUTER_API_KEY / KIMI / GOOGLE)
       3) proxy to upstream
```

Agent mode uses the same `UnifiedAIService` for planning, then `ExecutionEngine` tools.

Dev launch (`scripts/run-tauri.cjs`) spawns `backend-server.js`. Installed EXE alone does not guarantee a healthy up-to-date sidecar.

---

## Wave 1 fixes applied

1. Persist `AUTH_SECRET` under `D:\data\vibe-code-studio\` so sessions survive backend restarts.
2. Clearer proxy errors (sidecar down / 401 session / 503 missing key).
3. Desktop single-user skips the free-plan 10-message chat wall.
4. Boot warning when AI sidecar is unreachable after wait.
5. Root `GET /health` for simple probes.

## Wave 2 agent UX consolidation

| Control                    | Behavior                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| **Chat** (StatusBar)       | Opens AIChat in **chat** mode (Q&A, no tools)                           |
| **Agent** (StatusBar)      | Opens AIChat in **agent** mode (tool coding executor)                   |
| **Tasks**                  | Opens **Agent Manager** (background agents + inbox)                     |
| **Review**                 | Multi-agent analysis overlay — only if `VITE_ENABLE_REVIEW_AGENTS=true` |
| Legacy BackgroundTaskPanel | Only if `VITE_ENABLE_LEGACY_BACKGROUND_TASK_PANEL=true`                 |

Primary coding path is always AIChat Agent Mode (`AgentRuntime` / `ExecutionEngine`).

## Wave 3 + 4

- **Wave 3:** Keyboard/palette consistency; button audit in `docs/BUTTON_AUDIT.md`.
- **Wave 4:** Deleted legacy root `DeepSeekService`, `ConversationManager`, `DemoResponse*`,
  `AIProviderManager`, `LocalProvider`, orphan `useInlineEdit`. Updated `ARCHITECTURE.md`.

## Wave 5 — server keys without Settings (2026-07)

**Problem:** Agent Mode failed with “Provider openrouter is not configured… add an API key in Settings”
even when `OPENROUTER_API_KEY` was on the machine and `:5004/api/ai/health` reported `openrouter: true`.

**Cause:** Renderer AI factory marked proxy providers unavailable if the sidecar was late at boot;
proxy-mode lazy-init was a no-op (`return undefined`), so recovery never re-created `BackendProxyService`.
Secure storage warnings in Settings are unrelated to the happy path.

**Fix:**

1. Proxy lazy-init / `getProvider` auto-init empty-key BackendProxy providers.
2. Agent pre-flight re-inits factory when health has keys but factory is empty.
3. Boot wait prefers health with at least one configured server key.
4. Settings copy: keys belong on the backend env, not secure storage.

**Operator (no UI key paste):**

```powershell
# Ensure machine/user env has OPENROUTER_API_KEY, then start backend so Node sees it
$env:OPENROUTER_API_KEY = [Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY','Machine')
cd V:\monorepo\apps\vibe-code-studio
node scripts/backend-server.js
curl.exe -s http://127.0.0.1:5004/api/ai/health
# expect: "openrouter":true
```

---

## Operator smoke

```powershell
$env:OPENROUTER_API_KEY = [Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY','Machine')
cd V:\monorepo\apps\vibe-code-studio
node scripts/backend-server.js
# other terminal:
pnpm nx run vibe-code-studio:tauri:dev

curl.exe -s http://127.0.0.1:5004/health
curl.exe -s http://127.0.0.1:5004/api/ai/health
curl.exe -s -c jar.txt -b jar.txt http://127.0.0.1:5004/api/auth/me
```

---

## Related

- `src/hooks/useAIChat.ts`, `src/services/ai/UnifiedAIService.ts`
- `src/services/ai/providers/BackendProxyService.ts`
- `scripts/backend-server.js`, `scripts/routes/ai-proxy.js`
- `scripts/run-tauri.cjs`
