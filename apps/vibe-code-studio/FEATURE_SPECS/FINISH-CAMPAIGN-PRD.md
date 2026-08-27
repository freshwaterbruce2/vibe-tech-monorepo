# Vibe-Code-Studio — Finish Campaign PRD & Execution Plan

**Owner:** Bruce Freshwater · **Created:** 2026-07-06 · **Branch base:** `feat/vcs-lsp`
**Scope decision:** Full competitive parity (all 18 specs to a shippable state, right-sized per §3)
**Drives:** Loki Mode (supervised — see §6). This file is the PRD; Loki reads it each turn.

---

## 0. Definition of Done

VCS is "finished" when ALL of the following hold on `main`:

1. `pnpm nx typecheck|lint|build|test vibe-code-studio` all green (0 errors, 0 lint warnings, tests pass).
2. No `no-mock-or-placeholder-code` violations in any user-reachable production path (§Wave 1).
3. Every competitive-gap spec 01–16 is ✅ or an explicitly-documented, gracefully-degrading deferral in `PROGRESS.md` (not broken/half-wired).
4. Specs 12 (DAP), 14 (Notebooks), 13 (Remote/WSL) have shipped their agreed slices (§3 right-sizing).
5. Tauri MSI + NSIS build successfully; app launches and a human GUI click-through passes (Bruce-owned).
6. Working tree clean; `feat/vcs-lsp` merged to `main` via PR; cross-stream carry-over quarantined to its own branches.

---

## 1. Current State (research synthesis, 2026-07-06)

**Health:** ONE blocker — `src/services/lsp/lspClient.ts:165` TS2741 (missing `getCapabilities`), from uncommitted LSP Phase 1b work; fails typecheck+build. Lint: 2 unused eslint-disable directives (`ApiKeySettings.tsx:356`, `CodeQualityPanel.tsx:44`) + stale `eslint-suppressions.json` (needs `--prune-suppressions`). Tests: 2491 pass / 0 fail. Tauri config clean (no dead VS2022 linker pin).

**Working tree (111 dirty files):**

- 67 = real uncommitted VCS feature work (~2,600 lines + paired tests): LSP 07 **Phase 1b** (hover/def/signature-help/refs-peek/workspace-symbols), scheduling 16 UI, standards 03. → commit to `feat/vcs-lsp`, split 3 ways. **Contains the TS2741 fix target.**
- 12 = `coverage-*` output dirs → discard + `.gitignore`.
- 11 = root scratch (`_*scan.ps1`, empty `cookies.txt`) → discard.
- ~19 = unrelated carry-over: MCP-fleet fixes (real desktop-commander stderr fix + `http-transport.ts`) + dep bumps (**electron 33→39 needs desktop smoke test**) → quarantine to `chore/mcp-fleet` + `chore/deps` branches, NOT this campaign.

**Spec status:** ✅ 02, 09, 15, 16 · 🟡 (phases remain) 01,03,04,05,06,07,08,10,11 · ⬜ 12,13,14 · ⛔ 17,18.

**Legacy no-mock debt (predates competitive-gaps; the real finish work):**

- P1 user-reachable: `WorkspaceService` mock file-tree + `Math.random()` analysis (live via `useWorkspace`→`App.tsx`); `useWorkspace` mock AI-context; `useEditorActions.triggerAiCompletion` no-op; `useInlineEdit.startInlineEdit` stub.
- P2 dead (no prod caller): `MCPToolRegistry`, `ProactiveDebugger`, `analysis/*`, legacy `DeepSeekService`/`DemoResponseProvider`, `LazyComponents.loadCharts`, `FileExplorer` demo.

---

## 2. Guardrails — Loki Constitution Overrides (NON-NEGOTIABLE)

Loki Mode's defaults ("skip permissions / never ask / never stop") are **OVERRIDDEN** by these. The 2026-06-17 monorepo wipe was an unattended auto-permission agent; this campaign does not repeat it.

1. **Never `--dangerously-skip-permissions` against V:\monorepo.** Loki runs supervised (§6). All commits pass the pre-commit gates.
2. **100% diff coverage on new/changed code** (`check-diff-coverage.js`). vibe-code-studio is NOT grandfathered. `COVERAGE_GATE=off` allowed ONLY for a single UI/Monaco mount-wiring line, justified in the commit message. Every logic module = tested.
3. **Pathspec commits only:** `git add <paths>` then `git commit -m ... -- <paths>`. Never `git add -A` / bare `git commit` (parallel sessions share the index).
4. **No direct commits to `main`/`develop`.** Feature branch → PR only.
5. **No-mock rule:** zero placeholder/stub/mock in production paths. Implement fully or mark a documented graceful deferral.
6. **No-duplicates:** search (Glob/Grep) before creating any file/service; reuse the shared primitives (`problemsStore`, `injectMessage`, LSP relay-route pattern, `ArtifactViewer` kind-dispatch, `markdownRender`).
7. **No new dependency without Bruce sign-off** (§3). A phase gated on an unapproved dep does NOT start.
8. **Delete-guard stays on.** No destructive deletes on the V:\monorepo source tree.
9. **`.tsx` refresh rule:** no non-component exports from component `.tsx` (max-warnings 0) — helpers go in sibling `.ts`.
10. **New SQLite DDL** goes in `src-tauri/src/db.rs` `ensure_connection()` (`db_execute_query` rejects DDL).
11. **Checkpoint before each wave.** `Save-Snapshot.ps1` D:\ snapshot before destructive/large phases; git checkpoint per feature.
12. **One feature at a time; verify before moving on.** RARV cycle. No parallel _implementation_ agents on the same files.

---

## 3. Dependency Sign-off Gates (Bruce approves before the gated wave)

| Dep                    | Gates                       | Size/Risk                           | Recommendation                                  |
| ---------------------- | --------------------------- | ----------------------------------- | ----------------------------------------------- |
| `mermaid`              | 05 P3 executable plans      | render-only, moderate               | Approve — high value (makes plans executable)   |
| `plist` (XML)          | 01 `.tmTheme` import        | tiny                                | Approve — cheap, niche                          |
| `vscode-js-debug`      | 12 DAP Phase 1              | tens of MB, installer bloat + spike | Approve WITH spike-first gate                   |
| `debugpy`              | 12 DAP Phase 2              | pip, likely already present         | Approve (verify on host)                        |
| `CodeLLDB`             | 12 DAP Phase 3 (Rust debug) | large platform binary               | Defer — decide after P1/P2 land                 |
| `@jupyterlab/services` | 14 Notebooks Phase 2        | bundle-bloat risk                   | Approve ONLY after measuring bundle impact      |
| `russh` (+keys/sftp)   | 13 Remote-SSH core          | maturity gamble                     | **Defer** — SSH-agent core is separately-scoped |

**Waves 0–2 need ZERO new deps** → campaign starts immediately; dep decisions happen before their waves.

---

## 4. Execution Waves

### Wave 0 — Stabilize & reconcile tree (no deps) · size S

- Commit the 67 real VCS files to `feat/vcs-lsp`, split 3 ways (lsp / scheduling / standards). **Fixes TS2741** (`getCapabilities` on the `lspClient.ts:165` object literal).
- Prune lint: remove 2 unused eslint-disable directives; `eslint --prune-suppressions`.
- `.gitignore` the `coverage-*` dirs; delete them + root scratch (`_*scan.ps1`, `cookies.txt`).
- Quarantine carry-over: `chore/mcp-fleet` (Logger stderr fix + `http-transport.ts` + rag-bridge) and `chore/deps` (dependabot/electron 33→39 — smoke-test separately). NOT in this campaign's PRs.
- **Exit:** typecheck+lint+build+test all green on a clean tree. Update `PROGRESS.md` — LSP 07 marked 1b-shipped.

### Wave 1 — Retire legacy mocks (no-mock compliance) · size M

- **P1 (decide+act):** `WorkspaceService` — wire the "workspace intelligence" to real `FileSystemService`+LSP data OR delete if unused; kill the `Math.random()` analysis + mock file-tree. Replace `useWorkspace` mock AI-context with real content. Resolve `useEditorActions.triggerAiCompletion` + `useInlineEdit.startInlineEdit` (implement or remove from the Editor path).
- **P2 (delete dead):** remove confirmed-dead mock services (`MCPToolRegistry`, `ProactiveDebugger`, `analysis/*`, legacy `DeepSeekService`, `DemoResponseProvider`, `LazyComponents.loadCharts`, `FileExplorer` demo) after Grep-confirming zero prod callers.
- **Exit:** no no-mock violations in user-reachable paths; a runtime click-through of file-tree/AI-context shows real data.

### Wave 2 — Quick-win feature cluster (01–11, no deps) · size M

Sequenced by value/effort from recon:

1. 07 cross-file **references peek** preview (server already returns refs).
2. 05 P2 **clarifying-questions** flow (`[CLARIFY:]` markers, block dispatch until answered).
3. 07 editor **markers** (Monaco squiggle/gutter beyond problemsStore).
4. 08 P2 **gutter decorations** (per-test run/pass/fail glyphs, click-to-run).
5. 04 P2 **knowledge distiller** subagent (session-end fact proposal, staged for approval — no silent write).

- **Exit:** each shipped with 100% diff coverage; `PROGRESS.md` updated per spec.

### Wave 3 — Mid-tier 01–11 phases · size M–L

- 04 P3 staleness/conflict/memory-MCP sync (memory MCP exists). 03 P2 SKILL.md loader.
- 06 P2 **Gist-only** sync (reuse GitHub PAT `gist` scope; the `@vibetech/auth` backend does NOT exist — Gist only). 06 P3 profiles.
- 05 P3 dispatch + checkpoints + **Mermaid** (dep-gated). 01 `.tmTheme` (dep-gated).
- 08 P3 adapters (jest/playwright/pytest); "Debug Test" waits on Wave 4 spec 12.
- 10 P2 git worktree isolation (extends `GitService`). 11 P3 network capture + recordings.
- 10 P3 dedicated window + cross-workspace + merge-back. 03 P3 ACP (lowest value — moving target; last or drop).

### Wave 4 — XL specs (dep-gated, spike-first) · size L each

- **12 DAP:** spike `vscode-js-debug` headless handshake FIRST (half-day, throwaway) → Phase 1 Node breakpoints/stack/variables via a `dap-relay.js` route mirroring `lsp-relay.js` (NOT the orphan `backend/dap-proxy`) → P2 Python/watch/console → P3 launch.json + Debug-Test hook (unblocks 08 P3). Reuse `lsp-framing.js`, `problemsStore`, `TerminalPanel`.
- **14 Notebooks:** Phase 1 render/edit/save (nbformat v4 `NotebookSerializer`, per-cell Monaco, `markdownRender` reuse) — **no deps, standalone win** → Phase 2 kernel (gated on `@jupyterlab/services` bundle measurement + host Python). Phase 3 ipywidgets droppable.
- **13 Remote → WSL slice only:** ship WSL terminal+exec (`wsl.exe` already allowlisted in `pty.rs`), then WSL-FS via `\\wsl$` (needs `validate_cwd` UNC carve-out). **SSH-agent core is separately-scoped** (russh spike + agent binary = multi-month) — out of this campaign unless Bruce re-scopes. Remote-LSP parked behind 07 Phase 2.

### Wave 5 — Package, verify, merge · size S–M

- Build Tauri MSI + NSIS; validate sidecar bundling on the real installer.
- Bruce GUI click-through (in-session ops can't drive the packaged app — human-owned).
- Merge `feat/vcs-lsp` → `main` via PR (incremental: don't let it balloon; merge in wave-sized PRs per the 10-commit rule).

---

## 5. Verification Strategy

- **Per feature:** unit tests (100% diff coverage) → typecheck/lint → `/browser` or spec-11 verify loop for UI changes → RARV VERIFY step.
- **Per wave:** full `pnpm nx typecheck|lint|build|test vibe-code-studio` green before the next wave.
- **Adversarial:** for each shipped feature, a second agent attempts to refute correctness before marking done (Loki blind-review + devil's-advocate).
- **Human gates:** dep sign-offs (§3); packaged-app GUI click-through (Wave 5); electron/deps smoke test (quarantined).

---

## 6. Orchestration Model (how Loki runs this safely)

**Supervised Loki, NOT unattended.** Loki provides the loop (RARV), working memory (`.loki/CONTINUITY.md`), model tiering (Opus=plan, Sonnet=build, Haiku=tests/ops), and quality gates. The repo's pre-commit hooks are the hard backstop — they enforce coverage/size/paths/branch regardless of what Loki decides. Concretely:

- Loki works ONE wave at a time; Bruce reviews wave exit before the next starts.
- Deterministic outer loop: every commit must pass `check-diff-coverage.js` + ESLint + size caps + pathspec — Loki cannot bypass (`--no-verify` forbidden).
- Read-only research fan-out is unrestricted; implementation is one-file-at-a-time, one feature at a time.
- Checkpoints: D:\ snapshot before Waves 1 and 4; git checkpoint per feature; rollback on VERIFY failure.
- Escalate to Bruce on: dep needed, >3 retries, a spike failing (12 js-debug), or any destructive-op temptation.

---

## 7. Exit Conditions

- **Success:** §0 Definition of Done fully met; `main` green + packaged + click-through passed.
- **Wave-park:** any XL slice (13 SSH-agent, 12 Rust/CodeLLDB, 14 ipywidgets) may be deferred with a `PROGRESS.md` note rather than blocking the merge.
- **Halt & escalate:** js-debug spike fails · a dep is rejected · coverage/gate cannot be satisfied honestly (never fake a test).

---

## Rough sizing (calendar, solo + supervised agents)

Waves 0–2 (stabilize + mocks + quick wins): **days.** Wave 3 (mid-tier 01–11): **1–2 weeks.** Wave 4 (12 + 14 + 13-WSL): **3–6 weeks** (12 and 14-P2 are the long poles). Wave 5: **days.** Full parity incl. deferred XL tails (13-SSH, 14-ipywidgets, 12-Rust) is a **multi-month** commitment — the campaign ships the high-value core and parks the platform tails explicitly.
