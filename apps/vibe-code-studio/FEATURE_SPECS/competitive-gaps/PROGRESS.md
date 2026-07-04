# Competitive-Gaps Progress Tracker

**Purpose**: Shared checklist for ALL agent sessions working these specs in parallel.
Two-front convention: one session works from the START of the list (01 →), the other
from the END (← 18). **Before starting a spec, mark it 🔄 IN PROGRESS here (and commit
or at least save the file) so the other session doesn't collide. When shipped, check it
off with the commit hash.**

Branch: `feat/vcs-task-runner` (as of 2026-07-04). All work follows the repo gates:
100% diff coverage on new logic, lint/typecheck green, pathspec commits only
(`git commit -m ... -- <your paths>`) — parallel sessions share this working tree
and the index may hold the other session's staged files.

---

## Checklist

| #   | Spec                                 | Status          | Commit(s)              | Notes                                                                                                                                                             |
| --- | ------------------------------------ | --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Theming / TextMate                   | 🟡 Phase 1 done | `0395a18b`             | Shiki tokenizer + 8-preset picker. Phase 2 (VS Code JSON/tmTheme import UI) deferred                                                                              |
| 02  | Task runner + Problems panel         | ✅ DONE         | `2f87e246`, `76e6c10f` | Keystone shipped; problemsStore is the shared sink for 07/12                                                                                                      |
| 03  | Open agent standards (AGENTS.md/ACP) | ⬜ pending      |                        | Front-track candidate                                                                                                                                             |
| 04  | Agent memory / Knowledge Items       | ⬜ pending      |                        | Reuses StrategyMemory + memory MCP                                                                                                                                |
| 05  | Plan Mode                            | ⬜ pending      |                        | Track B starter per README                                                                                                                                        |
| 06  | Settings Sync + Profiles             | ⬜ pending      |                        |                                                                                                                                                                   |
| 07  | LSP language intelligence            | 🟡 1a+1b done   | `aee44d95`, `04d4344c` | 1a diagnostics + 1b hover/def/documentSymbol done. 1c (completion/find-refs/rename) + cross-file def jump + markers + phase 2 (auto-download/multi-root) deferred |
| 08  | Test Explorer                        | ⬜ pending      |                        | services/testing/\* exists; UI is the gap                                                                                                                         |
| 09  | Verifiable Artifacts                 | 🟡 Phase 1 done | `91d3ba21`             | Model + SQLite persistence + panel + live task_list capture. P2 (comments→agent queue) / P3 (walkthrough) deferred (see below)                                    |
| 10  | Agent Manager + parallel/worktrees   | ⬜ pending      |                        | Inbox here unblocks 16's deferred delivery                                                                                                                        |
| 11  | Browser verification                 | ⬜ pending      |                        |                                                                                                                                                                   |
| 12  | DAP debugger                         | ⬜ pending      |                        | L–XL; separately-scoped campaign per README                                                                                                                       |
| 13  | Remote dev (SSH/containers/WSL)      | ⬜ pending      |                        | L–XL; separately-scoped campaign                                                                                                                                  |
| 14  | Notebooks (.ipynb)                   | ⬜ pending      |                        | L                                                                                                                                                                 |
| 15  | PR review bot                        | ✅ DONE (P1-2)  | `1597b3d3`             | Phases 1-2 + vcs-review.yml workflow. Phase 3 autofix + MultiAgentReview deferred (see below)                                                                     |
| 16  | Agent scheduling (/schedule)         | ✅ DONE         | `f3a8ef15`             | See deviations below                                                                                                                                              |
| 17  | Cloud/background agents              | ⛔ deferred     |                        | XL — do not attempt as a sprint (README)                                                                                                                          |
| 18  | Extension host + Open VSX            | ⛔ deferred     |                        | XL — Tier B needs its own scoping spec; Tier A (curated Open VSX) may be pulled forward after 01                                                                  |

Legend: ✅ done · 🟡 partially done (phases remain) · 🔄 in progress (claimed by a session) · ⬜ pending · ⛔ deferred by design

---

## Shipped detail + open follow-ups

### 02 — Task Runner + Problems panel (✅ 2026-07-03)

- `.vcs/tasks.json` + problem matchers + shared Problems panel (`problemsStore`).
- Follow-up: none open; 07/12 write diagnostics into `problemsStore`.

### 16 — Agent Scheduling (✅ 2026-07-04, `f3a8ef15`)

- `/schedule` palette command, Schedule panel (create→preview→confirm, pause/resume/delete, run history 20), `ScheduleStore` (SQLite `agent_schedules` + fallback), cadence engine (once/interval/daily/weekly), `ScheduleRunner` 30s tick, missed-run policies, workspace guard.
- **Deviation**: the `scheduled-tasks` MCP named in the spec DOES NOT EXIST in the monorepo — in-app tick replaces it. Verify MCP dependencies named in other specs before relying on them.
- Open follow-ups: Inbox delivery (blocked on spec 10) · OS desktop notifications (Tauri notification plugin not installed — needs Bruce's dependency sign-off) · chat slash-command variant · inline schedule editing.

### 15 — PR Review Bot (✅ Phases 1-2, 2026-07-04, `1597b3d3`)

- Headless review of real GitHub PRs: `.github/workflows/vcs-review.yml` (all code PRs, budget-capped) → `scripts/review-ci.mjs` (tsx) → `src/services/review/*` orchestrator → summary comment + inline review comments with dedup (FNV-1a fingerprints in HTML-comment markers; GitHub is the only store).
- AICodeReviewer's stubbed `generateAIComments` is now REAL (opt-in provider hook; local panel unchanged). Bonus fix: `parseDiff` misattributed chunks in multi-file diffs (pre-existing bug).
- **Setup needed (Bruce):** add `OPENROUTER_API_KEY` repo secret to light up AI comments (without it the bot posts heuristics-only reviews). Smoke-test on a scratch PR after merge to main.
- Open follow-ups: Phase 3 autofix (needs `contents: write` + push capability) · MultiAgentReview integration (service is MOCK — do not wire to real PRs) · merge-blocking (AC 10) · `requestChangesEnabled` default-off until dogfooded.
- Gotcha for future specs: app `scripts/*.ts` files fail lint-staged (tsconfig doesn't include them) — CI/utility shims must be `.mjs`; `console.log` is lint-banned even there (use `process.stdout.write`).

### 09 — Verifiable Artifacts (🟡 Phase 1, 2026-07-04, `91d3ba21`)

- Artifact model + `artifacts` SQLite table (db.rs) + `ArtifactStore` (500-artifact retention) + task-grouped ArtifactsPanel (host pattern) + palette commands. Capture is event-driven off `BackgroundAgentSystem` (no changes to it): task_list born at task START as a live checklist, finalized on completed/failed. Diff artifacts re-render via `MultiFileDiffView`; malformed content falls back to raw view.
- **Confirmed for P2 planning**: `BackgroundAgentSystem` has NO mid-run message-injection point — P2's non-blocking comments must add one (spec's risk note was right).
- Open follow-ups: P2 comments + agent-queue push · P3 auto walkthrough (+ spec 11 screenshots) · wire `recordDiffArtifact` into the multi-file approval flow (one-line call in useAppHandlers once front-track churn settles) · EnhancedAgentMode shortcut · swap plan viewer to spec 05's markdown+Mermaid viewer when it exists.

### 01 — Theming (🟡 Phase 1, 2026-07-04, `0395a18b`)

- Shiki TextMate tokenizer + 8-preset theme picker; kept full `monaco-editor` (not -core).
- Open follow-ups: Phase 2 — VS Code theme-JSON / tmTheme import UX.

---

## Cross-session gotchas (read before committing)

- **Pathspec commits only** while sessions run in parallel: `git add <your paths>` then `git commit -m ... -- <your paths>`. Never bare `git commit` or `git add -A` — the index may carry the other session's staged mid-flight work.
- lint-staged runs `react-refresh/only-export-components` at max-warnings 0: no non-component exports from component `.tsx` files — put helpers in sibling `.ts` modules.
- `db_execute_query` rejects DDL: new SQLite tables go in `src-tauri/src/db.rs` `ensure_connection()`.
- AppLayout mount JSX has no render harness: `COVERAGE_GATE=off` with a documented justification in the commit message is the established precedent (76e6c10f, f3a8ef15, 0395a18b) — everything else must be 100% diff-covered.
- Global vitest setup mocks `window.electron.store` with a file-lifetime Map that never clears — `delete (window as ...).electron` in `beforeEach` when testing persistence.
