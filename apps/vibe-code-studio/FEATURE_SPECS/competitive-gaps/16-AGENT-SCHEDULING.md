# Feature Spec: Agent Scheduling (`/schedule`)

**Status**: ✅ SHIPPED 2026-07-04 (Phases 1–3 core; see "Implementation status" below for deviations and deferred items)
**Priority**: MEDIUM
**Effort**: M (1-2wk) — the monorepo's `scheduled-tasks` MCP does the hard scheduling part; VCS only needs a UI + runner glue
**Competitor parity**: Antigravity `/schedule` — schedule an agent task to run later or on a recurring cadence, delivered to an inbox
**Dependencies**: monorepo `scheduled-tasks` MCP (`mcp__scheduled-tasks__*`), existing `BackgroundAgentSystem`, `DatabaseService`, Tauri notification plugin

---

## User Story

As a developer, I want to schedule an agent task — "run the dependency audit every Monday at 9am," "refactor this module overnight" — so that recurring maintenance work happens automatically without me remembering to kick it off, and I get notified with results when it's done.

## Why VCS lacks this today

`BackgroundAgentSystem` (`submit(agentId, userRequest, workspaceRoot, parameters, options)`) runs a task immediately when submitted — it has a priority queue and concurrency cap (`maxConcurrent`), but no concept of "run this at a future time" or "run this every N days." There is no cron/interval scheduler in VCS and no persistence of schedule definitions across app restarts. The monorepo already ships a `scheduled-tasks` MCP built exactly for this purpose, but nothing in VCS calls it.

## Acceptance Criteria

1. ✅ A `/schedule` command (Command Palette entry `schedule-agent-task`) accepts a task description and a one-off future time, creating a persisted schedule (chat slash-command not wired — palette only)
2. ✅ Scheduled tasks are visible in a new Schedule panel: pending, next-run time, cadence (one-off vs recurring), last-run status
3. ✅\* Recurring schedules use a simplified picker (every-N-minutes / daily / weekly at HH:MM) — **not cron expressions**, and **not** the `scheduled-tasks` MCP, which does not exist in the monorepo (verified 2026-07-04; see Implementation status)
4. ✅ At the scheduled time, the runner submits the task to `BackgroundAgentSystem.submit(...)` exactly as if the user had typed it live
5. ⬜ Inbox delivery deferred — spec 10's Agent Manager Inbox doesn't exist yet; completions surface via the in-app notification system (the spec's own degraded mode)
6. ⬜ OS-level desktop notification deferred — the Tauri notification plugin is not installed (new dependency requires discussion); in-app notifications shipped
7. ✅ Schedules persist across VCS restarts (SQLite `agent_schedules` via the Tauri DB bridge, electron-store/localStorage fallback) with per-schedule run-on-launch vs skip missed-run policy
8. ✅ A schedule can be paused, resumed, or deleted from the Schedule panel (inline edit not shipped — delete + recreate)
9. ✅ Run history per schedule (last 20 runs, status, duration, error) is retained and viewable in the panel
10. ✅ Scheduled tasks pass through the same `BackgroundTaskOptions` (priority, timeout, retry) as manually submitted ones
11. ✅ Workspace-scope guard: a schedule whose `workspaceRoot` isn't the open workspace records a failed run and notifies — never silently retargets
12. ✅ Creating a schedule offers a preview step showing exactly what `BackgroundAgentSystem.submit` would be called with, before persisting

### Implementation status (2026-07-04)

Shipped on `feat/vcs-task-runner`. **Key deviation**: the `scheduled-tasks` MCP this spec
delegates cron/wake-up to **does not exist anywhere in the monorepo** — the dependency was
aspirational. Since `BackgroundAgentSystem` can only execute while VCS is running anyway
(the spec's own open question), the runner uses a 30s in-app tick (`ScheduleRunner`) with
missed-run policies covering closed-app triggers. If a shared scheduler MCP is built later,
`ScheduleRunner.check()` is the single seam to swap. Run history is embedded in the
schedule row (JSON blob, capped 20) instead of a separate `agent_schedule_runs` table,
matching the `strategy_memory` JSON-blob house pattern.

Files: `src/services/scheduling/{types,cadence,ScheduleStore,ScheduleRunner,schedulerIntegration}.ts`,
`src/stores/schedulesStore.ts`, `src/hooks/useScheduleCommands.tsx`,
`src/components/SchedulePanel/*`, `src-tauri/src/db.rs` (`agent_schedules` table),
mounts in `AppLayout.tsx` / `lazyPanels.ts` / `useAICommandPalette.tsx`.
74 new tests (cadence, store, runner, integration, panel, host, commands).

## Example `ScheduleDefinition` shape

```typescript
interface ScheduleDefinition {
  id: string;
  agentId: string;
  userRequest: string; // passed verbatim to BackgroundAgentSystem.submit
  workspaceRoot: string;
  parameters: Record<string, unknown>;
  cadence: { type: 'once'; runAt: string } | { type: 'cron'; expression: string };
  status: 'active' | 'paused';
  missedRunPolicy: 'run-on-launch' | 'skip';
  lastRunAt?: string;
  nextRunAt?: string;
}
```

This mirrors `BackgroundTask`'s existing field naming (`agentId`, `userRequest`, `workspaceRoot`, `parameters`) deliberately — `ScheduleRunner`'s entire job at trigger time is `BackgroundAgentSystem.submit(def.agentId, def.userRequest, def.workspaceRoot, def.parameters, options)`, a near-literal field passthrough rather than a translation layer.

## Architecture / Solution

```
/schedule command ──► ScheduleStore (DatabaseService, persisted)
                            │
                            ▼
                  scheduled-tasks MCP (cron/interval wake-up, existing monorepo service)
                            │  fires at trigger time
                            ▼
                  ScheduleRunner (new, thin glue)
                            │
                            ▼
                  BackgroundAgentSystem.submit(agentId, userRequest, workspaceRoot, ...)
                            │  on 'completed' / 'failed' events
                            ▼
                  Inbox delivery (spec 10) + Tauri desktop notification
```

VCS does not reimplement cron parsing or a wake-up timer — the monorepo's `scheduled-tasks` MCP already exists for exactly this. `ScheduleRunner`'s only job is: when the MCP signals a trigger, resolve the associated `ScheduleDefinition` and call `BackgroundAgentSystem.submit`. `BackgroundAgentSystem`'s existing `EventEmitter` (`'completed'`, `'failed'`, `'progress'`) is the hook point for both Inbox delivery and notifications — no changes needed to `BackgroundAgentSystem` itself, only new listeners.

## Implementation (phased)

### Phase 1 — One-off scheduled run + notification

- `src/services/scheduling/ScheduleStore.ts`: CRUD for `ScheduleDefinition` in `DatabaseService` (new `agent_schedules` table)
- `src/services/scheduling/ScheduleRunner.ts`: registers a one-off trigger with `scheduled-tasks` MCP, on fire calls `BackgroundAgentSystem.submit`
- `/schedule` command (Command Palette + chat) for one-off future runs only
- Tauri notification on completion/failure

### Phase 2 — Cron/recurring via scheduled-tasks MCP

- Extend `ScheduleDefinition` with cadence (cron expression or simplified picker compiling to one)
- `ScheduleRunner` registers recurring triggers with `scheduled-tasks` MCP, re-registers on each fire for the next occurrence
- Missed-schedule policy (run-on-launch vs. skip) configurable per schedule

### Phase 3 — Inbox delivery + run history

- On `BackgroundAgentSystem` `'completed'`/`'failed'` for a schedule-originated task, push a summary item into the Agent Manager Inbox (spec 10)
- `src/components/SchedulePanel/`: pending/active list, pause/resume/edit/delete, run-history view per schedule
- Run history persisted (last N runs, status, duration) alongside the schedule definition

## Integration points (existing code to hook into)

- `src/services/BackgroundAgentSystem.ts` — `submit()` is the exact entry point scheduled runs use; existing `'completed'`/`'failed'`/`'progress'` events are the notification/Inbox hook, no changes to this file needed
- `src/services/TaskQueue.ts` — if scheduled runs need queue-priority interplay with manually submitted tasks, this is where it's reconciled
- `src/services/DatabaseService.ts` — new `agent_schedules` + `agent_schedule_runs` tables
- `src/components/Notification.tsx`, `src/hooks/useBackgroundTaskNotifications.ts` — existing notification plumbing extended for schedule-originated completions
- Monorepo `scheduled-tasks` MCP (`mcp__scheduled-tasks__create_scheduled_task`, `list_scheduled_tasks`, `update_scheduled_task`) — the actual cron/wake-up mechanism
- Spec 10 (Agent Manager Inbox) — delivery target for completed scheduled-run summaries

## Test Scenarios

- Vitest: `ScheduleStore.test.ts` — CRUD round-trip, schedule survives a simulated app-restart (reload from `DatabaseService`)
- Vitest: `ScheduleRunner.test.ts` — mock `scheduled-tasks` MCP trigger, assert `BackgroundAgentSystem.submit` is called with the schedule's stored `userRequest`/`workspaceRoot`/`parameters`
- Vitest: missed-schedule policy — simulate a trigger time in the past on load, assert run-on-launch vs. skip behaves per configured policy
- Playwright: create a one-off schedule 60s in the future via `/schedule`, wait, assert a completed run appears in Schedule panel history and Inbox
- Playwright: pause a recurring schedule, assert no run fires at the next scheduled time
- Vitest: workspace-scope guard — a schedule targeting a `workspaceRoot` that no longer exists on trigger produces a failed run with a clear error, never silently retargets another open workspace

## Success Metrics

- Scheduled trigger-to-task-submission latency < 5s from the `scheduled-tasks` MCP firing
- Zero lost schedules across 10 consecutive VCS restart cycles (persistence correctness)
- 100% of schedule-originated completions land in Inbox (no silent drops if VCS was backgrounded)
- Zero cross-workspace misfires across the schedule test suite (Acceptance Criteria #11 enforced, not just documented)

## Why this rides on the existing MCP instead of a new scheduler

The temptation with "add scheduling" is to build a small cron engine inside VCS. That's explicitly avoided here: the monorepo already runs a `scheduled-tasks` MCP server, and duplicating its wake-up/cron logic inside VCS would mean two independent schedulers to keep correct instead of one. `ScheduleRunner` is intentionally the thinnest possible layer — register a trigger, react to a fire event, call `BackgroundAgentSystem.submit`. If `scheduled-tasks` MCP's capabilities turn out to be insufficient (see Risks below), that's a reason to extend the shared MCP, not to fork scheduling logic into VCS alone.

## UI surface note

The Schedule panel (Phase 3) is not a wholly new visual pattern — it should reuse the list/status-badge/run-history layout `TaskMonitorPanel` already establishes for in-flight `BackgroundTask`s, just filtered to schedule-originated tasks plus a pending/next-run-time column that ad-hoc tasks don't need. Keeping the two panels visually consistent means a user who already understands "how running tasks look" in VCS doesn't have to learn a second UI language for scheduled ones.

---

**Risks / Open questions**: Does `scheduled-tasks` MCP require VCS (or a host process) to be running at trigger time, or can it wake VCS itself? If it can't launch VCS, missed-schedule handling on app-closed becomes the primary UX concern, not an edge case — needs verifying against the MCP's actual capabilities before Phase 2 cron work starts. Spec 10 (Inbox) should ideally land before or alongside Phase 3 here. Should a paused schedule that's edited (time/cadence changed) auto-resume, or stay paused until explicitly resumed — recommend staying paused, to avoid a surprise 9am run from an edit made at 11pm the night before.
**Sequencing**: Wave 2. Phase 1-2 are independent of spec 10; Phase 3 (Inbox delivery) is soft-blocked on spec 10 existing, but can degrade to notification-only in the interim.
