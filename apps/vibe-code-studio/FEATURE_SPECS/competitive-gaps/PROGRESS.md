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

| #   | Spec                                 | Status          | Commit(s)              | Notes                                                                                            |
| --- | ------------------------------------ | --------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| 01  | Theming / TextMate                   | 🟡 Phase 1 done | `0395a18b`             | Shiki tokenizer + 8-preset picker. Phase 2 (VS Code JSON/tmTheme import UI) deferred             |
| 02  | Task runner + Problems panel         | ✅ DONE         | `2f87e246`, `76e6c10f` | Keystone shipped; problemsStore is the shared sink for 07/12                                     |
| 03  | Open agent standards (AGENTS.md/ACP) | ⬜ pending      |                        | Front-track candidate                                                                            |
| 04  | Agent memory / Knowledge Items       | ⬜ pending      |                        | Reuses StrategyMemory + memory MCP                                                               |
| 05  | Plan Mode                            | ⬜ pending      |                        | Track B starter per README                                                                       |
| 06  | Settings Sync + Profiles             | ⬜ pending      |                        |                                                                                                  |
| 07  | LSP language intelligence            | ⬜ pending      |                        | Unblocked (02 shipped); writes into problemsStore                                                |
| 08  | Test Explorer                        | ⬜ pending      |                        | services/testing/\* exists; UI is the gap                                                        |
| 09  | Verifiable Artifacts                 | ⬜ pending      |                        |                                                                                                  |
| 10  | Agent Manager + parallel/worktrees   | ⬜ pending      |                        | Inbox here unblocks 16's deferred delivery                                                       |
| 11  | Browser verification                 | ⬜ pending      |                        |                                                                                                  |
| 12  | DAP debugger                         | ⬜ pending      |                        | L–XL; separately-scoped campaign per README                                                      |
| 13  | Remote dev (SSH/containers/WSL)      | ⬜ pending      |                        | L–XL; separately-scoped campaign                                                                 |
| 14  | Notebooks (.ipynb)                   | ⬜ pending      |                        | L                                                                                                |
| 15  | PR review bot                        | ⬜ pending      |                        | **Next from the end.** Reuses AICodeReviewer/MultiAgentReview                                    |
| 16  | Agent scheduling (/schedule)         | ✅ DONE         | `f3a8ef15`             | See deviations below                                                                             |
| 17  | Cloud/background agents              | ⛔ deferred     |                        | XL — do not attempt as a sprint (README)                                                         |
| 18  | Extension host + Open VSX            | ⛔ deferred     |                        | XL — Tier B needs its own scoping spec; Tier A (curated Open VSX) may be pulled forward after 01 |

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
