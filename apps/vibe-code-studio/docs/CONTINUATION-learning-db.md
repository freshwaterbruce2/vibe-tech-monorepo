# Continuation: Make the Learning DB Real in Vibe Code Studio

**Status:** handoff — 2026-06-20. Picks up after a verification + DB-repair session.
**App:** `V:\monorepo\apps\vibe-code-studio` (Tauri 2 + React 19; Node backend on port 5004).
**Data:** `D:\databases\vibe_studio.db` (shared by the Node backend via better-sqlite3 **and** the
Tauri layer via rusqlite — keep that invariant: both open the *same* file).

---

## TL;DR for the next agent

Do these in order:

1. **Task 2 first (code):** wire the agent's runtime learning to the SQLite `strategy_memory`
   table and surface a viewer. (Doing the code before the rebuild means one rebuild ships everything.)
2. **Task 1 (build):** rebuild + reinstall the Tauri desktop app so the already-applied `db.rs`
   schema fix *and* the Task-2 wiring reach the installed binary.
3. **Task 3 (after 1 & 2):** isolate `vibe_studio.db` into a clean VCS-only database.

Hard rules (from the workspace): **pnpm only**, **PowerShell 7** (chain with `;` not `&&`),
**all data on `D:\`**, search-before-create (no duplicates), files ≤1000 lines / functions ≤50
lines (`.tsx` components exempt from the 50-line fn cap), absolute Windows paths.

---

## What is ALREADY done (do NOT redo)

A prior session diagnosed and **partially fixed** the learning DB:

- **Bug found:** `src-tauri/src/db.rs` created `strategy_memory` with `pattern_hash TEXT NOT NULL`
  (no `UNIQUE`), but `db_save_pattern` upserts via `ON CONFLICT(pattern_hash)` — which **errors at
  runtime** without a unique index. `BrainScan.tsx`'s `INSERT OR REPLACE` was broken for the same reason.
- **Data orphan found:** 29 real historical learning patterns live in the legacy-named table
  `deepcode_strategy_memory`, while all current code targets `strategy_memory` — so the table the
  code reads was empty.
- **Fixed already:**
  - `src-tauri/src/db.rs` `CREATE TABLE` now declares `pattern_hash TEXT UNIQUE NOT NULL`
    (source change — **only reaches the installed app after Task 1's rebuild**).
  - The **live** `D:\databases\vibe_studio.db` now has a correct `strategy_memory`
    (`pattern_hash TEXT UNIQUE NOT NULL` + unique index) **backfilled with all 29 rows** from
    `deepcode_strategy_memory`. An `ON CONFLICT` upsert self-test passed (usage_count 1→2).
  - Backup before the change: `D:\backups\vibe_studio_20260620_205144.db` (56.7 MB).

So the SQLite learning store is now **correct and populated** — but **nothing in the live app reads
or writes it yet**. That gap is Task 2.

---

## Architecture you need to know

**Two learning paths exist, and they are disconnected:**

1. **Runtime agent learning — `src/services/ai/StrategyMemory.ts`.** This is what actually runs.
   The agent loop calls `storeSuccessfulPattern()` (line ~39) after a successful ReAct cycle.
   It persists via `saveToStorage()` (line ~428) / `loadFromStorage()` (line ~389) to
   **`window.electron.store` or `localStorage`** under key `'deepcode_strategy_memory'` — **NOT SQLite**.
   `queryPatterns()` (line ~111) feeds the planner (`src/services/ai/planning/`). This works but the
   memory is trapped in the webview store, not the durable `D:\` database.

2. **SQLite store — `src-tauri/src/db.rs`.** Tauri commands:
   - `db_get_patterns()` → top 100 by usage/success from `strategy_memory`.
   - `db_save_pattern(pattern: String, tags: Option<String>)` → upsert; hashes `pattern` with
     fnv1a as `pattern_hash`, stores `pattern` as `pattern_data`. **Note:** it does NOT accept the
     structured fields (success_rate, usage_count) or a caller-supplied hash.
   - `db_execute_query(sql, query_params)` → validated DML/DQL passthrough (SELECT/INSERT/UPDATE/DELETE
     only; DDL/PRAGMA/multi-statement rejected — see `validate_sql`).
   The renderer reaches these through `src/services/tauriShim.ts` (`db.getPatterns` line ~170,
   `db.execute`/`db.query` lines ~177-184). **Gotcha:** the shim's `db` object and the type in
   `src/types/electron.d.ts` (lines 71-77) expose `query/execute/getPatterns/close` but **no
   `savePattern`** — even though a `case 'db:savePattern'` exists in the ipc switch (tauriShim ~300).

3. **Dead code:** `src/components/Justice/BrainScan.tsx` is a working "Brain Scan" viewer
   (reads `db.getPatterns()`, writes `INSERT OR REPLACE INTO strategy_memory`) but is **not imported
   anywhere in VCS** (grep confirms) — it's branded "Vibe-Justice" and leaked from the vibe-justice app.

4. **Unimplemented surface:** `electron.d.ts` also types a `learning?` IPC
   (`recordMistake/recordKnowledge/findSimilarMistakes/...`, lines 78-86) that has **no Tauri backend**
   (db.rs implements none of it). Treat it as aspirational, not real. `DatabaseService.migrateStrategyMemory()`
   (`src/services/DatabaseService.ts` ~493) does a one-time localStorage→`strategy_memory` migration in
   non-fallback DB mode.

---

## Task 2 — Wire the learning loop to SQLite + a viewer  *(do this FIRST)*

**Goal:** the agent's successful patterns persist to `strategy_memory` in `D:\databases\vibe_studio.db`
(durable, queryable on `D:\`), survive restart, and are visible in a real in-app viewer.

**2a. Persist StrategyMemory to SQLite (with web/dev fallback).**
- In `StrategyMemory.saveToStorage()` (and the single-pattern write in `storeSuccessfulPattern`),
  add a SQLite write **when `window.electron?.db` exists** (Tauri desktop). Keep the
  `localStorage`/`store` path as the fallback for web/dev mode (`pnpm dev:web`), where there is **no
  Tauri** and `window.electron.db` is undefined. `storageAvailable`/the existing capability check is
  the place to branch.
- **Use `window.electron.db.execute(...)` with an explicit upsert** rather than `db_save_pattern` —
  because `db_save_pattern` hashes the pattern text and can't carry `success_rate`/`usage_count`, and
  it keys on a different hash than StrategyMemory's `problemSignature`. The existing 29 rows are keyed
  by `problemSignature` (e.g. `"custom::explain how this file relates to::custom"`), so match that:
  ```ts
  await window.electron.db.execute(
    `INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(pattern_hash) DO UPDATE SET
       pattern_data = excluded.pattern_data,
       success_rate = excluded.success_rate,
       usage_count  = strategy_memory.usage_count + 1,
       last_used    = CURRENT_TIMESTAMP`,
    [pattern.problemSignature, JSON.stringify(pattern), pattern.successRate, pattern.usageCount]
  );
  ```
  (`ON CONFLICT` now works because `pattern_hash` is UNIQUE.) Single statement only — `db_execute_query`
  rejects multi-statement and DDL.
- On `loadFromStorage()`, prefer reading from SQLite (`db.getPatterns()`) when Tauri is present, falling
  back to the store. Re-hydrate `Date` fields and the `Map<problemSignature, StrategyPattern>`.
- Keep writes resilient: a SQLite failure must not crash the agent loop (log + continue), mirroring the
  current try/catch style.

**2b. Surface a viewer.**
- Revive `BrainScan.tsx` as the viewer: move it out of `components/Justice/`, rebrand from
  "Vibe-Justice: Brain Scan" to VCS, and **wire it into the app** — add a panel + a toggle
  (status-bar item or command-palette entry, following how other panels register in
  `src/app/AppLayout.tsx` / `src/app/contexts.tsx` and `useAICommandPalette`). Lazy-load it like the
  other panels (`src/components/LazyComponents.tsx`).
- `pattern_data` is the full `StrategyPattern` JSON — parse `problemDescription` / `successfulApproach`
  / `usageCount` / `successRate` for display instead of dumping raw JSON.
- Watch the 1000-line file cap; split if needed. `.tsx` is exempt from the 50-line function cap.

**Acceptance criteria (Task 2):**
- In the **installed desktop app** (after Task 1) or via a Tauri dev run, complete a successful agent
  task → a new/updated row appears in `strategy_memory` in `D:\databases\vibe_studio.db`
  (verify with a sqlite read).
- The viewer lists patterns (the 29 backfilled + any new ones), and the count persists across an app restart.
- `pnpm nx typecheck vibe-code-studio` passes; `pnpm nx test vibe-code-studio` stays green
  (currently **856 passed / 22 skipped**); changed-file lint clean.

---

## Task 1 — Rebuild + reinstall the desktop app  *(do AFTER Task 2's code)*

**Why:** the `db.rs` `UNIQUE` fix and all Task-2 renderer changes only ship in a rebuilt binary. One
rebuild covers both.

**Packaging recipe that works on this machine** (MSVC is fragile here — see
`~/.claude/.../memory/windows-msvc-toolchain-cargo-linker.md`):
- Toolchain: **VS 18 Community** only (VS2022 BuildTools is GONE). `CARGO_HOME=D:\Data\Tools\.cargo`,
  cargo target-dir redirected to `D:\cargo-targets`.
- VCS's `src-tauri/.cargo/config.toml` linker pin was already removed (good). Do **not** re-pin it.
- In a PowerShell session: import `vcvars64`, prepend `D:\Data\Tools\.cargo\bin` to `PATH`, set
  `GIT_CONFIG_GLOBAL=NUL`, `GIT_CONFIG_NOSYSTEM=1`, `NX_NO_CLOUD=true`, then run
  `pnpm --filter vibe-code-studio exec tauri build` (bypass `run-tauri.cjs` — its vcvars env-merge does
  not actually deliver `link.exe` to cargo). The repo script is `pnpm --filter vibe-code-studio package`
  (= `tauri:build`), but the direct `exec tauri build` is the known-good path.
- Installers land in `D:\cargo-targets\release\bundle\{msi,nsis}\`. NSIS is per-user; silent reinstall:
  `& "D:\cargo-targets\release\bundle\nsis\Vibe Code Studio_<ver>_x64-setup.exe" /S` → installs to
  `%LOCALAPPDATA%\Vibe Code Studio\`.
- On OOM/parallelism failure, reduce jobs — do **not** blindly retry the same command.

**Acceptance criteria (Task 1):**
- Fresh installer built; app installed at `C:\Users\fresh_zxae3v6\AppData\Local\Vibe Code Studio\vibe-code-studio.exe`.
- App launches, login works (backend on 5004), and Task-2 acceptance passes against the installed build.
- Sanity: on a *clean* DB the app now creates `strategy_memory` **with** the UNIQUE constraint (verify the
  DDL), confirming the source fix is live.

---

## Task 3 — Isolate `vibe_studio.db` to a clean VCS-only DB  *(only AFTER 1 & 2)*

**Problem:** `D:\databases\vibe_studio.db` is ~57 MB and holds **~80 tables** — most belong to *other*
apps (trading, figma, design, crypto, nova, etc.). It looks seeded from a shared DB. VCS's own tables in
it: `users` (12 rows), `stripe_customers`/`stripe_subscriptions`/`stripe_events`, `deepcode_*`,
`strategy_memory` (29 rows), analytics. It works, but it's a contaminated, bloated file.

**Risk:** both the Node backend (`scripts/backend-server.js` line 47, `DB_PATH = 'D:\\databases\\vibe_studio.db'`)
and Tauri (`src-tauri/src/db.rs` `get_db_path()`) open this exact path. The 12 users + Stripe rows live
here — repointing the path without migrating those tables **breaks auth and billing**.

**Safe approach:**
1. Back up first (`Copy-Item` to `D:\backups\`).
2. Build a fresh DB containing **only** VCS tables — copy across `users`, `stripe_*`, `strategy_memory`,
   `deepcode_*`, analytics rows; drop everything else. Decide whether to keep the filename
   `vibe_studio.db` (rebuild-in-place: new clean file at the same path) or a new name.
3. Keep the Node backend (`DB_PATH`) and Rust (`get_db_path`) **pointing at the same file** — they must
   agree. Prefer driving both from the `DATABASE_PATH` env var (db.rs already honors it; have
   backend-server.js read it too) so there's one source of truth.
4. Verify: auth round-trip returns the **same** users (e.g. `POST /api/auth/login` for an existing user);
   `strategy_memory` still has 29 rows; other apps' tables are gone; file size drops dramatically.

**Acceptance criteria (Task 3):** clean VCS-only DB in use; auth + billing + learning all still work;
no foreign app tables remain; backup retained.

---

## Key files

| Path | Role |
|---|---|
| `src-tauri/src/db.rs` | Tauri SQLite commands; `strategy_memory` schema (UNIQUE fix applied here) |
| `src/services/ai/StrategyMemory.ts` | Runtime agent learning; store/localStorage today → add SQLite (Task 2a) |
| `src/services/tauriShim.ts` | `window.electron.db` impl (getPatterns/execute/query); no `savePattern` |
| `src/types/electron.d.ts` | `db?` + unimplemented `learning?` IPC types |
| `src/components/Justice/BrainScan.tsx` | Dead viewer to revive/rewire (Task 2b) |
| `src/services/DatabaseService.ts` | `migrateStrategyMemory()` localStorage→SQLite (~line 493) |
| `src/migrations/001_initial_schema.sql` | Legacy `deepcode_strategy_memory` schema (has the data) |
| `scripts/backend-server.js` | Node backend; `DB_PATH` (line 47), opens same DB (Task 3) |
| `D:\backups\vibe_studio_20260620_205144.db` | Pre-fix backup |

## Verification commands

```powershell
pnpm nx typecheck vibe-code-studio
pnpm nx test vibe-code-studio          # expect 856 passed / 22 skipped
pnpm nx lint vibe-code-studio          # whole-tree red is legacy size-cap debt; gate on changed files
# DB read (better-sqlite3 resolves from monorepo node_modules):
$env:NODE_PATH="V:\monorepo\node_modules"; node -e "const D=require('better-sqlite3');const db=new D('D:\\databases\\vibe_studio.db',{readonly:true});console.log(db.prepare('SELECT COUNT(*) c FROM strategy_memory').get());"
```
