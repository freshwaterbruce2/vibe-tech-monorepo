# Feature Spec: Verifiable Artifacts

**Status**: 🟡 PHASE 1 SHIPPED 2026-07-04 (model + persistence + panel + capture for task_list/plan/diff; Phase 2 comments→agent-queue and Phase 3 walkthrough/screenshots pending — see "Implementation status" below)
**Priority**: HIGH
**Effort**: M (1-2wk) — data model + panel + persistence is straightforward; non-blocking comment injection into a running agent is the harder Phase 2 piece
**Competitor parity**: Antigravity Artifacts — task list, plan, walkthrough, screenshot, diff as reviewable, commentable trust objects
**Dependencies**: existing `DatabaseService`, `BackgroundAgentSystem`, `MultiFileDiffView.tsx`, spec 11 (screenshot source for walkthroughs), spec 05 (plan markdown as a `plan`-type artifact source)

---

## User Story

As a developer reviewing an agent's work, I want a curated set of artifacts (plan, task list, diffs, a walkthrough) instead of a raw scrolling log, so that I can verify what the agent did by reading a few reviewable documents and leave comments the agent picks up later, without having to babysit its live output or stop it to ask a question.

## Why VCS lacks this today

`TaskMonitorPanel` (`src/components/TaskMonitorPanel/`) models a `BackgroundTask` with `TaskStatus`/`TaskType` and renders it as a live card with a progress bar and a raw `LogsContainer` — this is process telemetry, not a reviewable artifact. There is no persisted, typed object a human can open after the fact, annotate, and link back to the task that produced it; `MultiFileDiffView.tsx` shows diffs but only in the context of an active review flow, not as a standalone linked artifact.

## Acceptance Criteria

1. ✅ `Artifact` type with `id`, `taskId`, `kind` (full 5-kind union; Phase 1 records task_list/plan/diff), `title`, `content`, `createdAt` (+`updatedAt`), `status` (`draft | final`) — `src/services/artifacts/types.ts`
2. ✅ Persisted in a new `artifacts` SQLite table (real `task_id`/`kind` columns + JSON blob, created in `src-tauri/src/db.rs`; electron-store/localStorage fallback per house pattern), queryable by `taskId` and `kind` via `ArtifactStore.list()`
3. ✅ Artifacts panel (`src/components/ArtifactsPanel/`, store-driven host pattern) lists artifacts grouped by task with kind icons, draft/final badges, and previews
4. ✅ `diff` artifacts open in the existing `MultiFileDiffView` (approve/reject close the frozen record); malformed payloads fall back to a raw view instead of crashing
5. ✅\* `plan` artifacts open as preformatted markdown — the spec-05 markdown+Mermaid viewer doesn't exist yet (spec 05 unstarted); swap in when it ships
6. ⬜ Phase 2 — inline comments (artifact_comments table + anchored UI)
7. ⬜ Phase 2 — non-blocking comment→agent-queue push (BackgroundAgentSystem has NO mid-run message-injection point today — confirmed; Phase 2 must add one, as the spec's risk note anticipated)
8. ⬜ Phase 3 — auto walkthrough on completion
9. ✅\* Every artifact and task group deep-links to the originating task — opens the existing Background Tasks panel (`BackgroundTaskPanel` is the shipped task surface; `TaskMonitorPanel` exists but is not mounted in AppLayout)
10. ✅ Artifacts persist across restarts (ArtifactStore + SQLite; restart round-trip covered by tests)
11. ⬜ Phase 2 — comment resolution audit trail
12. ✅ `task_list` artifact is created at task START (`submitted` event) as a draft checklist that evolves live: `stepStart` appends `- [ ]`, `stepComplete` checks it, `completed`/`failed` finalize with an outcome footer

### Implementation status (2026-07-04 — Phase 1)

Shipped on `feat/vcs-lsp`. New: `src/services/artifacts/` (types, artifactContent codecs,
ArtifactStore, artifactCapture), `src/stores/artifactsStore.ts`, `src/components/ArtifactsPanel/`
(styled, index, ArtifactViewer, ArtifactsPanelHost), `useArtifactCommands` palette entries,
`artifacts` table in db.rs. Capture is purely event-driven off `BackgroundAgentSystem`'s
existing emitter (submitted/stepStart/stepComplete/completed/failed) — no changes to that
service. `recordDiffArtifact`/`recordPlanArtifact` are the public producers for the
multi-file flow and spec 05 respectively (wiring the multi-file approval flow to
`recordDiffArtifact` is deliberately deferred — `useAppHandlers.tsx` is under active
front-track churn; one-line call when it settles). EnhancedAgentMode shortcut deferred with
it (palette + host cover access). Retention backstop: 500 artifacts, oldest dropped.

## Architecture / Solution

Artifacts are a persistence + presentation layer on top of existing execution systems — they do not replace `BackgroundAgentSystem`'s live task model, they summarize and freeze moments of it. No new Rust process is required; this is SQLite (via existing `DatabaseService`, which already runs through the Tauri SQL plugin) plus React components. The only cross-process concern is the non-blocking comment injection, which reuses the same in-process event/queue mechanism `BackgroundAgentSystem` already uses to communicate with running tasks (no new IPC surface).

The core design principle is that artifacts are the reviewable _surface_, while `BackgroundTask`/`TaskMonitorPanel` remain the operational _substrate_. A reviewer should be able to fully evaluate a task's output by reading its artifacts alone; the raw log view stays available for debugging but is no longer the primary trust mechanism. This mirrors how a pull request's diff and description are reviewed independently of its CI log.

```
BackgroundAgentSystem task lifecycle
   -> on step completion: emit artifact-worthy events (diff produced, plan referenced)
   -> ArtifactService.record(kind, taskId, content) -> DatabaseService.insert('artifacts', ...)
   -> on task completed: ArtifactService.generateWalkthrough(taskId)
        -> gathers task_list + diff + screenshot artifacts for that taskId
        -> renders a walkthrough markdown artifact

ArtifactsPanel (React)
   -> DatabaseService.query('artifacts', { taskId? , kind? })
   -> renders list; click -> MultiFileDiffView | PlanViewer | ScreenshotViewer

Comment flow
   -> user submits comment on artifact X (taskId T)
   -> ArtifactService.addComment(...) -> DatabaseService.insert('artifact_comments', ...)
   -> if BackgroundAgentSystem.isRunning(T): push comment onto that task's message queue
        (same mechanism used for existing mid-task user input, not a new channel)
   -> agent's next planning tick sees the comment as additional context; task keeps running
```

`Artifact.content` for `task_list` and `plan` is markdown; for `diff` it stores file paths + unified diff text (rendered via `MultiFileDiffView`); for `screenshot` it stores a file path under the workspace's `.vcs/artifacts/screenshots/` directory (written by spec 11's browser sidecar) plus a caption.

**Data model**:

```ts
interface Artifact {
  id: string;
  taskId: string;
  kind: 'task_list' | 'plan' | 'walkthrough' | 'screenshot' | 'diff';
  title: string;
  content: string; // markdown, or JSON-stringified diff/screenshot payload
  createdAt: string;
  status: 'draft' | 'final';
}

interface ArtifactComment {
  id: string;
  artifactId: string;
  anchor: string; // line number for diff/plan, region descriptor for screenshot
  body: string;
  resolved: boolean;
  createdAt: string;
}
```

Both tables use `taskId`/`artifactId` foreign keys so a single SQL query can hydrate the Artifacts panel's task-grouped view without an N+1 pattern — one query for artifacts by workspace, one for comments by the resulting artifact id set.

## Implementation (phased)

### Phase 1 — Artifact model + panel (task_list, plan, diff)

Add `artifacts` and `artifact_comments` tables via `DatabaseService` migration. Add `ArtifactService.ts` (`src/services/ArtifactService.ts`) with `record()`, `list()`, `get()`. Add `ArtifactsPanel` component tree under `src/components/ArtifactsPanel/` (mirroring `TaskMonitorPanel`'s file layout: `index.ts`, `types.ts`, `styled.ts`). Wire `diff` artifacts to open in `MultiFileDiffView.tsx`. `task_list` artifacts are seeded from the same `AgentStep[]` that `TaskPlanner`/Plan Mode already produce, so this phase has no new content-generation logic to write — only persistence and display.

### Phase 2 — Non-blocking inline comments -> agent queue

Add `artifact_comments` UI (anchor-based, Google-Docs-style gutter markers) to the plan/diff viewers. Add `ArtifactService.addComment()` with the running-task detection and queue push, hooking into `BackgroundAgentSystem`'s existing message-injection point (the same one used for mid-run user clarification, if present) so this is additive, not a new control path. If no such injection point exists yet, this phase must add one to `BackgroundAgentSystem` first — treat that as in-scope risk, not a blocking dependency on another spec.

### Phase 3 — Auto walkthrough + screenshot embedding

Add `ArtifactService.generateWalkthrough(taskId)`, triggered on `BackgroundAgentSystem` task-completed events. Pull in `screenshot` artifacts (populated by spec 11's browser verification loop) and embed them inline in the generated walkthrough markdown. The walkthrough template is a fixed markdown skeleton (Goal / What Changed / Files Touched / Verification) populated from the task's other artifacts, so it renders identically whether or not spec 11 has shipped yet — screenshot embedding degrades gracefully to a text-only walkthrough when no `screenshot` artifacts exist for the task.

## Integration points (existing code to hook into)

- `src/components/TaskMonitorPanel/` — deep-link target from artifact list items; reuse `TaskStatus`/`TaskType` types for cross-referencing.
- `src/services/BackgroundAgentSystem.ts` — event source for artifact creation and completion-triggered walkthrough generation; injection point for non-blocking comments.
- `src/services/DatabaseService.ts` — persistence for `artifacts` and `artifact_comments` tables.
- `src/components/EnhancedAgentMode/` — surfaces a shortcut into the Artifacts panel for the active task.
- `src/components/MultiFileDiffView.tsx` — renderer reused for `diff`-kind artifacts.
- spec 11 (`11-BROWSER-VERIFICATION.md`) — supplies `screenshot` artifact content.
- spec 05 (`05-PLAN-MODE.md`) — supplies `plan`-kind artifact content (the `.vcs/plans/*.md` file).

## Test Scenarios

- Vitest: `ArtifactService.record()` persists and `list({ taskId })` returns artifacts scoped to that task only.
- Vitest: `addComment()` on an artifact whose task is still `running` calls the task's message-queue push exactly once and does not call any cancel/pause method.
- Vitest: `addComment()` on an artifact whose task is already `completed` persists the comment but does not attempt a queue push (no running task to receive it).
- Vitest: `generateWalkthrough()` on a completed task with 2 diff artifacts and 1 screenshot artifact produces markdown containing references to all three.
- Vitest: resolving a comment via `resolveComment(id)` sets `resolved: true` and the comment remains queryable via `getComments({ artifactId })`, not deleted.
- Playwright: complete a task in Agent Mode, open Artifacts panel, assert a `walkthrough` card appears and opens to a page embedding the diff summary.
- Playwright: while a task is `running`, add a comment on its `plan` artifact; assert the task's status badge remains `running` (never transitions to `paused`).
- Playwright: start a task, immediately open the Artifacts panel, assert a `task_list` artifact is already visible before the task reaches `completed`.

## Success Metrics

- % of artifact-linked tasks where the deep link (Acceptance Criterion 9) is actually used to jump into `TaskMonitorPanel` — a low rate suggests artifacts alone are sufficient and the link is rarely needed, which is the target outcome rather than a failure.
- % of completed agent tasks that produce a walkthrough artifact reaches 100% (Phase 3 gate).
- Reviewer time-to-approve a task (time from task-completed to human approval/merge) decreases relative to baseline raw-log review.
- Comment-to-agent-response latency (comment submitted -> agent's next action reflects it) stays under one planning tick.
- % of task reviews that never open the raw `TaskMonitorPanel` log view (artifacts alone were sufficient) increases over successive releases — the clearest signal the trust mechanic is working as intended.

---

**Risks / Open questions**: Non-blocking comment injection requires `BackgroundAgentSystem` to expose or already have a mid-run message channel — confirm this exists before Phase 2 starts; if not, Phase 2 effort grows and may need to land alongside spec 10's queue work. Artifact storage growth (screenshots especially) needs a retention/cleanup policy in `DatabaseService`. Anchor stability for diff comments (line numbers shifting as the agent makes further edits after a comment is posted) is unresolved — likely needs anchors keyed to diff hunks rather than raw line numbers.
**Sequencing**: Wave 2, after spec 05 (needs plan markdown format) starts. Soft-depends on spec 11 for full Phase 3 value but Phases 1-2 ship independently. Feeds spec 10's Inbox (approvals reference artifacts).
