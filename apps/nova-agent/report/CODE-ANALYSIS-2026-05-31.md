# Nova Agent — Deep Code Analysis (2026-05-31)

Read-only static analysis across four areas: Rust/Tauri backend, React frontend,
RAG/memory pipeline, and IPC/capabilities security. No files were modified.

Method: targeted grep + representative file reads (~30 files opened). Findings cite
real `file:line`. Where a claim could not be fully verified by reading, it is marked
**[verify]**.

---

## Executive summary

Nova Agent (Tauri v2, v1.3.0) is in good architectural shape on the controls that
matter most for a local desktop app: **no hardcoded secrets** anywhere in source,
**least-privilege Tauri capabilities**, **strong path-traversal enforcement**, **safe
command execution** (arg arrays, not shell strings), and **secrets in Windows
Credential Manager**. The real issues are (1) a WebSocket JWT auth control that is
effectively non-functional security theater, (2) hardcoded data-DB paths that violate
the env-var policy, and (3) unfinished migrations leaving duplicate dashboards and dual
RAG pipelines.

Overall: **no critical exploitable vulnerabilities found**; the highest-value work is
finishing migrations and removing dead/scaffolding code so the security story isn't
muddied by non-functional stubs.

---

## CRITICAL

_None confirmed._ (The one candidate — files pointing at a "deleted" `nova_shared.db` —
was disproven: the DB exists at `D:\databases\nova_shared.db`, 36 KB, modified
2026-05-31. Downgraded to a policy issue, see HIGH-3.)

---

## HIGH

### H1 — WebSocket JWT auth is non-functional (ephemeral self-signed secret)
`src-tauri/src/modules/websocket_auth.rs:91-122`, wired at
`src-tauri/src/websocket_client/client.rs:49,306`

`TokenManager::new()` calls `generate_secret_key()`, which returns
`format!("{}{}", Uuid::new_v4(), Uuid::new_v4())` — a **fresh random secret per
process**. The client signs its own JWT with this secret and sends it. No server
sharing a configured secret can validate it, and the secret doesn't survive a restart.
The module's own doc-comments admit the key "should" come from Windows Credential
Manager, but `new()` never loads it. The entire module is also gated by
`#![allow(dead_code)]` (line 1) with validate-side methods marked
`// Used server-side` / `// Reserved for future`.

- **Why it matters:** This is presented as a security control ("2026 Security Best
  Practice") but provides no actual authentication — it's auth theater. Worse, it can
  give a false sense of a secured IPC channel.
- **Fix:** Either (a) load the shared secret via `CredentialStore::get(keys::...)` so
  client/server share it, or (b) if WS auth isn't actually enforced yet, delete the
  module rather than ship dead security scaffolding (per the no-mock/no-placeholder
  rule).

_(H2 candidate "`/admin` route is unprotected" was **investigated and rejected** as a
false positive — see Investigated-and-cleared below.)_

---

## MEDIUM

### M1 — Hardcoded data-DB paths violate env-var policy
- `src-tauri/src/modules/prompts.rs:6` — `const DB_PATH = "D:\\databases\\nova_shared.db"`
- `src-tauri/src/modules/system_prompt.rs:32` — `r"D:\databases\nova_shared.db"`
- `src-tauri/src/modules/calendar.rs:24` — `"D:\\databases\\nova_calendar.json"`
  (file does **not** currently exist on disk — created on first write **[verify]**)
- `src-tauri/src/modules/pattern_engine.rs:104` — `"D:\\databases\\agent_learning.db"`
- `src-tauri/src/modules/orchestrator.rs:6` — `"C:\\dev\\tools\\nova_orchestrator.py"`

Workspace policy (`.claude/rules/database-storage.md`, `paths-policy.md`) requires DB
paths come from env vars (`DATABASE_PATH`), never hardcoded. `state.rs:65,78` already
does this correctly (`env::var("WORKSPACE_ROOT")`, `env::var(...).unwrap_or_else`) — so
the pattern exists; these modules just don't use it.
- **Fix:** Route these through the same config/env resolution `state.rs` uses.

### M2 — Duplicate / unfinished dashboard migration
`src/App.tsx:36-50` — `NovaDashboard` + `NovaDashboard2026` behind feature flag
`nova.ui.new-dashboard`, **plus** `VibeDashboard`, plus raw test routes
`/dashboard-new` and `/dashboard-legacy`. The `/` root (line 49) hardwires
`NovaDashboard2026`, bypassing the very feature flag `/dashboard` respects.
- **Why it matters:** Three dashboard implementations + flag inconsistency = the
  no-duplicates rule violated and ambiguous "which is canonical." Maintenance tax.
- **Fix:** Pick the canonical dashboard, make `/` and `/dashboard` agree, delete the
  legacy component and test routes once the flag is fully rolled out.

### M3 — Dual RAG pipelines (Rust LanceDB vs TS) risk divergence
- Rust: `src-tauri/src/modules/rag.rs` — migrated to **LanceDB** (not ChromaDB; the
  memory note is now outdated). Exposes Tauri commands `rag_index_file` (`:194`),
  `rag_search` (`:287`), `rag_index_directory` (`:372`), `rag_clear_index` (`:432`),
  all via `lancedb::connect(&config.lance_db_path)`.
- TS: `src/rag/` — full embedder/retriever/reranker/indexer pipeline embedding via the
  `localhost:3001` proxy, driven by Inngest background functions.
- **Why it matters:** Two independent RAG stacks (different languages, possibly
  different embedding models/dimensions and on-disk schemas) can silently diverge.
- **Fix:** Document the intended split (e.g. Rust = live in-app query, TS = background
  bulk indexing) and ensure both write a **compatible** LanceDB schema + identical
  embedding model/dimension — or consolidate. **[verify embedding-model parity between
  rag.rs and embedder.ts]**

### M4 — `mockData.ts` is dead code in a production path
`src/hooks/dashboard/mockData.ts` — grep finds **zero** importers across `src/`.
- **Why it matters:** The no-mock rule forbids mock data outside test files; even
  unused, it's a trap waiting to be wired into a real component.
- **Fix:** Delete it (it's not imported), or move under `__tests__/` if a test needs it.

### M5 — `unwrap()`/`expect()`/`panic!` density in backend
169 occurrences across 26 files. A meaningful share is in inline `#[cfg(test)] mod
tests` blocks (e.g. `tests.rs`, `ipc_integration.rs`, `http_server_tests.rs`), but
non-test hotspots warrant a focused audit:
`procedural.rs` (41), `recommendations.rs` (13), `credentials.rs` (13),
`memory.rs` (12), `migration_utils.rs` (11), `tasks.rs` (9), `websocket_auth.rs` (8).
- **Why it matters:** An `unwrap()` on a Tauri command path turns a recoverable error
  into a renderer-visible panic / poisoned state.
- **Fix:** Audit the non-test hotspots; convert IPC-reachable `unwrap()` to `?` with
  `Result<_, String>` returns. **[verify which counts are test vs prod per file]**

---

## LOW

### L1 — API key prefix logged
`src-tauri/src/modules/llm/provider.rs:365` logs `&provider.api_key[..8.min(len)]`
(first 8 chars). Minor info leak to logs; prefer logging only a boolean "key present"
or a hash. Keys themselves are correctly sourced via
`CredentialStore::get_with_fallback` → env → config (`provider.rs:183-185`), never
hardcoded.

### L2 — React/TS convention violations
12 files use `import React from 'react'` or `React.FC` (e.g. `main.tsx`,
`features/analysis-manager.ts`, `pages/Resources.tsx`,
`components/routes/FeatureFlaggedRoute.tsx`, `components/ModelCard.tsx`,
`pages/chat/ChatSidebar.tsx`, `pages/chat/MessageList.tsx`). Repo TS rules forbid both.
- **Fix:** `pnpm eslint "src/**/*.tsx" --fix` + manual `React.FC` removal.

### L3 — `style-src 'unsafe-inline'` in CSP
`src-tauri/tauri.conf.json:51`. `script-src 'self'` is correctly strict;
`style-src 'unsafe-inline'` is a minor relaxation (common with CSS-in-JS / Tailwind
runtime). Low risk given `script-src` lockdown. Track for future hardening.

### L4 — Mobile Bridge binds `0.0.0.0` when LAN mode enabled
`src-tauri/src/http_server.rs:435-438` binds all interfaces only when
`mobile_lan_enabled()`; otherwise `127.0.0.1`. CORS origins are required (`:430-432`)
and a `mobile_bridge_token` exists (`:420`). Exposure is opt-in and token-gated —
acceptable — but confirm `mobile_bridge_token` has sufficient entropy. **[verify token
generation strength]**

---

## Positive findings (controls that are correctly implemented)

- **No hardcoded secrets** in `src/` or `src-tauri/src/` (grep for `sk-`, `api_key=`,
  `password=`, `Bearer …` — clean; only test fixtures and partial-prefix logging).
- **Least-privilege capabilities** — `capabilities/default.json` grants only
  `core:app/event/window/webview:default`; no broad `fs`/`shell` scopes, no `**`
  wildcards. fs/exec happen in Rust commands gated by `path_policy`.
- **Path traversal hardened** — `path_policy.rs` rejects `..`, URL-encoded traversal
  (`%2e/%2f/%5c`), NUL/control chars, enforces absolute + canonicalized + allowed-root
  prefix matching (case-insensitive, prefix-safe so `C:\developer` ≠ `C:\dev`).
- **Safe command execution** — `execution.rs:138-140` uses `Command::new(program)` +
  `command.args(args)` (array form, no shell string interpolation); `program` comes
  from a `RuntimeProfile` allowlist.
- **Secrets at rest** — `credentials.rs` uses keyring-rs → Windows Credential Manager
  with a precedence chain (Credential Manager → env → config).
- **CSP `script-src 'self'`**, `withGlobalTauri: false`, `macOSPrivateApi: false`.
- **`.env` is gitignored** — `git ls-files` returns nothing for `apps/nova-agent/.env`
  and `git check-ignore` confirms it; only `.env.example` is tracked. No secrets in VCS.
- **Centralized command surface** — single `tauri::generate_handler!` in `main.rs:321`.

---

## Investigated and cleared (negative results worth recording)

- **`/admin` route auth** — `AdminPage` self-gates: `if (!isAdmin) return <AdminLogin/>`
  (`src/components/admin/AdminPage.tsx:16-22`). `/admin` is intentionally the login
  surface — it cannot be wrapped in `ProtectedRoute` because `ProtectedRoute` redirects
  unauthenticated users *to* `/admin` (`ProtectedRoute.tsx`). Admin content renders only
  when `isAdmin` is true. **Not a vulnerability.** (Cosmetic: guard styles differ between
  routes, but behavior is correct.)
- **`nova_shared.db` "deleted"** — the DB exists (`D:\databases\nova_shared.db`, 36 KB,
  modified 2026-05-31). The stale memory note was wrong; `prompts.rs`/`system_prompt.rs`
  are not pointing at a missing file. Remaining issue is only the hardcoded path (M1).
- **Robust embedding client** — `embedder.ts` has retry (5x), 429 back-off, batch
  throttling to respect OpenRouter rate limits.

---

## Recommended next actions (priority order)

1. **H1** — Fix or delete `websocket_auth.rs` (don't ship non-functional security).
2. **M1** — Move hardcoded `D:\databases\*` paths to env-var resolution.
3. **M5** — Audit IPC-reachable `unwrap()` in the named hotspots.
4. **M2 / M3 / M4** — Finish the dashboard migration, document/converge the dual RAG
   pipelines, delete dead `mockData.ts`.
5. **L1/L2/L3** — Stop logging key prefixes; eslint-fix React imports.

_Verification flags (`[verify]`) mark claims that need a confirming read or runtime
check before acting._
