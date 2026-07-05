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

| #   | Spec                                 | Status                 | Commit(s)                                      | Notes                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------ | ---------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Theming / TextMate                   | 🟡 Phase 1 done        | `0395a18b`                                     | Shiki tokenizer + 8-preset picker. Phase 2 (VS Code JSON/tmTheme import UI) deferred                                                                                                                                                                                                |
| 02  | Task runner + Problems panel         | ✅ DONE                | `2f87e246`, `76e6c10f`                         | Keystone shipped; problemsStore is the shared sink for 07/12                                                                                                                                                                                                                        |
| 03  | Open agent standards (AGENTS.md/ACP) | ⬜ pending             |                                                | Front-track candidate                                                                                                                                                                                                                                                               |
| 04  | Agent memory / Knowledge Items       | ⬜ pending             |                                                | Reuses StrategyMemory + memory MCP                                                                                                                                                                                                                                                  |
| 05  | Plan Mode                            | ⬜ pending             |                                                | Track B starter per README                                                                                                                                                                                                                                                          |
| 06  | Settings Sync + Profiles             | ⬜ pending             |                                                |                                                                                                                                                                                                                                                                                     |
| 07  | LSP language intelligence            | 🟡 1a–1d done          | `aee44d95`, `04d4344c`, `9f7f3d23`, `b6da9713` | 1d: F2 rename → textDocument/rename → WorkspaceEdit mapped into MultiFileEditApprovalPanel preview/apply (no new apply path; no prepareRename — server capabilities not tracked). Deferred: cross-file refs peek preview, markers, phase 2 (auto-download/multi-root/Settings)      |
| 08  | Test Explorer                        | ⬜ pending             |                                                | services/testing/\* exists; UI is the gap                                                                                                                                                                                                                                           |
| 09  | Verifiable Artifacts                 | ✅ P1–3 done           | `91d3ba21`, `fe774ff5`, `4827c6e9`, `2111ddda` | P3 shipped 2026-07-05: auto walkthrough at task settle (Goal/What Changed/Files Touched/Verification, spec-11 screenshots as inline `artifact:` refs) + screenshot image renderer in the viewer. Remaining (deferred by design): comment anchors + resolution audit trail (AC #11)  |
| 10  | Agent Manager + parallel/worktrees   | ⬜ pending             |                                                | Inbox here unblocks 16's deferred delivery                                                                                                                                                                                                                                          |
| 11  | Browser verification                 | 🔄 Phase 2 in progress | `6c972ddf`, `b86d3e2c`                         | Phase 2 (autonomous post-edit verification loop: dev-server orchestration + gated verify pass → walkthrough Verification) claimed 2026-07-05. Phase 1 shipped: permissioned /browser via the registered `playwright` MCP through MCPService (per DEPENDENCY_AUDIT — no new sidecar) |
| 12  | DAP debugger                         | ⬜ pending             |                                                | L–XL; separately-scoped campaign per README                                                                                                                                                                                                                                         |
| 13  | Remote dev (SSH/containers/WSL)      | ⬜ pending             |                                                | L–XL; separately-scoped campaign                                                                                                                                                                                                                                                    |
| 14  | Notebooks (.ipynb)                   | ⬜ pending             |                                                | L                                                                                                                                                                                                                                                                                   |
| 15  | PR review bot                        | ✅ DONE (P1-2)         | `1597b3d3`                                     | Phases 1-2 + vcs-review.yml workflow. Phase 3 autofix + MultiAgentReview deferred (see below)                                                                                                                                                                                       |
| 16  | Agent scheduling (/schedule)         | ✅ DONE                | `f3a8ef15`                                     | See deviations below                                                                                                                                                                                                                                                                |
| 17  | Cloud/background agents              | ⛔ deferred            |                                                | XL — do not attempt as a sprint (README)                                                                                                                                                                                                                                            |
| 18  | Extension host + Open VSX            | ⛔ deferred            |                                                | XL — Tier B needs its own scoping spec; Tier A (curated Open VSX) may be pulled forward after 01                                                                                                                                                                                    |

Legend: ✅ done · 🟡 partially done (phases remain) · 🔄 in progress (claimed by a session) · ⬜ pending · ⛔ deferred by design

---

## Shared primitives (build once — reuse, don't duplicate)

### Mid-run message injection — `BackgroundAgentSystem` (SHIPPED by 09 P2, `fe774ff5`)

The per-task pending-message queue that specs 10 (Agent Manager / Inbox) and 16
(deferred Inbox delivery) must CONSUME rather than rebuild:

- `injectMessage(taskId, body): InjectedMessage | null` — appends to a per-task queue.
  Returns `null` (no-op) if the task doesn't exist or is not `pending`/`running`.
- Queue is DRAINED at the next step boundary (`onStepStart`, before the step's
  ReAct/action runs) and folded into that step's `action.params.injectedUserMessages`
  (string[]), which reaches the model via ReActExecutor's prompt (`Params:` JSON block).
  No preemption of an in-flight step — delivery is always at the next safe boundary.
- Events: `messageQueued(task, msg)` on accept · `messageInjected(task, msg)` on drain
  (UI marks delivery) · `messageDropped(task, msg)` if the task finishes/cancels with
  messages still queued (consumers degrade to plain feedback).

## Shipped detail + open follow-ups

### 09 — Verifiable Artifacts P3 (✅ 2026-07-05, `2111ddda`)

- Auto walkthrough (AC #8): `artifactCapture.onFinished` (the existing completed/failed
  capture listeners — no new agent-loop hook) now records a final `walkthrough` artifact
  built by `walkthroughGenerator.ts`: Goal / What Changed (outcome + `n/m planned steps
completed` derived from the task_list checklist + diff titles) / Files Touched (deduped
  across decoded diff artifacts) / Verification (spec-11 screenshots).
- Screenshots embed as inline refs `![title](artifact:<id>)` — walkthrough content stays
  text-only; `ArtifactWalkthroughView` resolves refs against the artifacts store at render
  time (missing/undecodable → placeholder text). Text-only degradation everywhere.
- Deferred spec-11 follow-up landed: `ArtifactScreenshotView` renders screenshot-kind
  artifacts as images (data-URL + caption; malformed → raw fallback) and screenshot cards
  get a friendly preview instead of raw JSON.
- Generation gate = the task_list lifecycle guard: only tasks capture observed produce a
  walkthrough; requeued retries and unknown tasks never double-generate.
- Still deferred by design: comment anchors + resolution audit trail (AC #11) · threads on
  diff/walkthrough kinds · narrated/interactive walkthroughs · spec 11 P3's autonomous
  verify loop feeding these automatically.

### 11 — Browser verification (🟡 Phase 1, 2026-07-05, `6c972ddf` + `b86d3e2c`)

- `/browser` rides the registered `playwright` MCP (mcp/registry.json) through the existing
  `MCPService` client — NO new CDP/Playwright sidecar (DEPENDENCY_AUDIT reuse finding).
  `services/browser/`: `BrowserSessionService` (permission gate) + `browserMcpAdapter`
  (action ↔ tool mapping, defensive result parsing) + `browserSessionStore` +
  `BrowserPermissionPromptHost` (AppLayout host; approve/deny modal + session chip w/ revoke).
- Agent surface: new `browser_action` ActionType (registry/planner docs/parser). Allowlist:
  navigate/click/type/snapshot/read_console/screenshot — click/type address elements by
  `ref` from a prior `snapshot` (@playwright/mcp model). All failures return structured
  results (`no_session`/`permission_denied`/`server_error`/…), never throws to the agent.
- Session contract (AC #1/#9/#12): single active session, scoped to ONE BackgroundTask;
  first `browser_action` triggers the prompt (120s timeout = deny); ends on user revoke,
  task settle (`bindTaskEvents` on completed/failed/cancelled), or replacement.
- Screenshots → spec 09 `screenshot`-kind artifacts (`recordScreenshotArtifact` +
  `encode/decodeScreenshotContent`, data-URL embedded, 4M-char cap) — the seam 09 P3
  walkthroughs consume.
- **Shared step-param (spec 10/12 may reuse):** `BackgroundAgentSystem` now stamps
  `step.action.params.backgroundTaskId ??= task.id` at the `onStepStart` boundary (same
  drain pattern as `injectedUserMessages`) — executors can key per-task state on the
  BackgroundTask id the UI shows, not the planner's internal AgentTask id.
- Compliance side effects: `types/agent.ts` → `agent.types.ts` (types-only; joins the
  `*.types.ts` coverage-exclusion convention — prettier reflow had put its interface lines
  under the diff gate with no coverable statements); ResponseParser got a full test suite
  (reflow → 100% covered) + legacy over-length lines fixed; suppressions pruned.
- Deviation from spec: no Tauri sidecar/`Command.sidecar()` (AC #2) — the MCP server IS the
  isolated browser process; web mode degrades to a structured `unsupported_environment`.
  ArtifactsPanel renders screenshot artifacts via raw-content fallback for now (image viewer
  is a small follow-up).
- Open follow-ups: Phase 2 (console/network streaming + recording to `.vcs/artifacts/recordings/`)
  · Phase 3 (post-edit autonomous verify loop + walkthrough, with spec 09 P3) · screenshot
  artifact image renderer in ArtifactsPanel · palette `/browser` shortcut.

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

### 09 — Verifiable Artifacts P2 (🟡 Phases 1–2, 2026-07-05, `fe774ff5` + `4827c6e9`)

- Comment threads on task_list/plan artifacts (`ArtifactCommentThread`, `artifact_comments`
  SQLite table + `ArtifactCommentStore` fallback pattern, 1000-comment retention, cascade on
  artifact delete). `addArtifactComment` → `injectMessage` while the task is pending/running;
  delivery badge tracks queued → delivered (`messageInjected`) and degrades to feedback on
  `messageDropped`/finished-task. Agent sees messages via `step.action.params.injectedUserMessages`
  in ReActExecutor's prompt.
- Compliance side effect: `BackgroundAgentSystem.executeTask` split (planTask /
  buildExecutionCallbacks / handleExecutionFailure), `waitFor` settle listeners consolidated —
  the pre-commit ESLint ignores the suppressions baseline, so a touched legacy file must
  actually meet the 50-line cap. Suppressions pruned (file entry + stale AICodeReviewer).
- Open follow-ups: P3 auto walkthrough (+ spec 11 screenshots) · comment anchors + resolution
  audit trail (AC #6 anchored UI, AC #11) · diff/walkthrough-kind threads · everything below.

### 09 — Verifiable Artifacts P1 (2026-07-04, `91d3ba21`)

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
- **Sanctioned `COVERAGE_GATE=off` category** (narrow — NOT a general escape hatch): a UI/Monaco **mount-wiring** line with no render harness. Two forms qualify: (a) AppLayout lazy-mount JSX; (b) the single provider/attach call inside `handleEditorMount` where the `monaco` instance only exists at mount. **Rule: only that one mount-wiring line may be uncovered; every logic module it calls must be 100% diff-covered, and the commit message must carry the justification.** Anything beyond a single mount line — parsers, adapters, stores, registries, business logic — must be tested; write the test. Precedents: `76e6c10f`, `f3a8ef15`, `0395a18b` (AppLayout JSX / legacy reflow); `aee44d95`, `04d4344c` (LSP editor-mount wiring, all 10 logic files 100%).
- Global vitest setup mocks `window.electron.store` with a file-lifetime Map that never clears — `delete (window as ...).electron` in `beforeEach` when testing persistence.
