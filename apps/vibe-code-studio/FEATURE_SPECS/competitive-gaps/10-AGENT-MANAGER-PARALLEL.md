# Feature Spec: Agent Manager (Parallel, Multi-Workspace)

**Status**: 📋 PLANNED (PARTIAL — `EnhancedAgentMode` runs one agent in the current editor context, `BackgroundAgentSystem` runs local background work, but there is no Manager surface, no cross-workspace view, and no git worktree isolation for concurrent agents)
**Priority**: HIGH
**Effort**: L (3-6wk) — worktree lifecycle management and a new window/route surface are substantial; Phase 1 alone is closer to M
**Competitor parity**: Antigravity Manager + Cursor Agents Window — spawn/track many parallel agents, aggregate approvals into one Inbox
**Dependencies**: `@tauri-apps/api` (multiwindow), existing `GitService`, `BackgroundAgentSystem`, `TaskQueue`, `AgentCoordinator`/`AgentOrchestrator`, `AgentHealthMonitor`

---

## User Story

As a developer running several agent tasks at once (different features, possibly different workspaces), I want a single Manager surface that lists every running agent, aggregates their pending approvals into one Inbox, and isolates each agent's file changes in its own git worktree, so that parallel agents cannot clobber each other's edits and I don't have to context-switch between separate editor windows to see what needs my attention.

## Why VCS lacks this today

`EnhancedAgentMode.tsx` is a modal/panel bound to one workspace's editor context (`workspaceContext` prop) and one `orchestrator` instance — it has no concept of "other agents running elsewhere." `BackgroundAgentSystem` runs background tasks but within the same workspace's file tree, so two concurrent agents editing overlapping files today would race on the same working directory. There is no aggregated approval queue; each agent's questions surface only within its own panel.

## Acceptance Criteria

1. ⬜ A Manager surface exists as a dedicated Tauri window (via `@tauri-apps/api/window` `WebviewWindow`, new `manager` route) reachable from a menu/command-palette entry.
2. ⬜ The Manager lists all active agents across the current workspace with live status pulled from `AgentHealthMonitor`/`AgentMonitor` (idle, running, blocked, error, completed).
3. ⬜ Each list entry shows the agent's current task summary, elapsed time, and files touched so far.
4. ⬜ Starting a new agent from the Manager creates an isolated **git worktree** via `GitService` (`git worktree add <path> -b <branch>`), so the agent operates on its own working directory and branch.
5. ⬜ An **Inbox** view aggregates all pending approvals/clarifying questions from every running agent into one chronological list, each item deep-linking to its agent's detail view.
6. ⬜ Approving/answering an Inbox item resumes only that agent; other agents are unaffected.
7. ⬜ A "merge back" action diffs a completed agent's worktree branch against the main working tree using the existing diff UI (`MultiFileDiffView.tsx`) before merging.
8. ⬜ Closing/stopping an agent from the Manager cleans up its worktree (`git worktree remove`) unless the user explicitly opts to keep it for later inspection.
9. ⬜ The Manager can list agents across more than one open workspace (cross-workspace), not just the active one.
10. ⬜ Agent health failures (per `AgentHealthMonitor`) surface as a distinct visual state in the Manager list, separate from normal `error` task status.
11. ⬜ Two agents targeting overlapping files never share a working directory — worktree isolation is enforced, not opt-in per agent.
12. ⬜ The Manager window can be closed without stopping any running agents (agents keep executing in the background; the window is a view, not the process owner).

## Architecture / Solution

The Manager is a second Tauri webview window sharing the same Rust backend process as the main editor window — Tauri 2's multiwindow support allows this without spinning up a separate app instance. Git worktree operations are the one place this spec requires new Rust-side work: worktree creation/removal should go through `GitService`'s existing shell-out pattern (adding `worktree add`/`worktree remove`/`worktree list` subcommands to whatever `git` invocation wrapper `GitService` already uses), not a new sidecar. Cross-window state (agent list, Inbox) is synchronized via Tauri's event system (`emit`/`listen`) rather than duplicating state stores per window.

This is intentionally not a client-server split — both windows are views onto the same in-process agent state, which keeps the implementation close to VCS's existing single-process model instead of introducing a second source of truth. The tradeoff is that closing the main window while agents are running needs explicit handling (agents must not die with the window that happened to start them), which Phase 1 should treat as a first-class requirement rather than an edge case discovered later.

```
Main window                          Manager window
-------------                        ---------------
AgentOrchestrator.start(task)        ManagerStore (zustand)
   -> GitService.worktreeAdd(path)      <- tauri event 'agent-status-changed'
        (isolates this agent's FS)      <- tauri event 'agent-approval-needed'
   -> BackgroundAgentSystem tracks
      task against worktree path        Inbox aggregates approval events
   -> emits 'agent-status-changed'      across all agents/workspaces
        via Tauri event API
   -> on approval-needed, emits         User answers in Inbox
        'agent-approval-needed'            -> tauri emit 'agent-approval-answered'
                                            -> routed back to the specific
                                               AgentOrchestrator instance
```

Each agent's worktree lives under `<repo>/.vcs/worktrees/<agent-id>/`. `AgentCoordinator` gains a registry mapping `agentId -> { worktreePath, branch, orchestrator }` so the Manager can address individual runs.

**Data model** (registry entry shape, held in-memory by `AgentCoordinator` and mirrored into `ManagerStore` via events):

```ts
interface ManagedAgent {
  agentId: string;
  workspaceId: string;
  worktreePath: string;
  branch: string;
  status: 'idle' | 'running' | 'blocked' | 'error' | 'completed';
  healthState: 'healthy' | 'degraded' | 'unresponsive'; // from AgentHealthMonitor
  taskSummary: string;
  filesTouched: string[];
  startedAt: string;
}

interface InboxItem {
  id: string;
  agentId: string;
  kind: 'approval' | 'clarifying_question';
  prompt: string;
  createdAt: string;
  answeredAt?: string;
}
```

`ManagedAgent.status` tracks task execution state; `healthState` tracks process liveness independently, per Acceptance Criterion 10 — an agent can be `running` and `degraded` simultaneously (slow but alive), which the list UI renders as two separate badges rather than collapsing into one status enum.

## Implementation (phased)

### Phase 1 — Multi-agent list + live status within one workspace

Add `ManagerStore` (zustand) that subscribes to `AgentHealthMonitor` and `BackgroundAgentSystem` for all agents in the current workspace. Build the list UI (can initially render inside the main window as a new panel before the dedicated window ships) showing status, task summary, elapsed time. This phase deliberately skips worktree isolation — agents still share the workspace root — so it can ship and be dogfooded while Phase 2's git plumbing is built in parallel.

### Phase 2 — Git worktree isolation per agent

Extend `GitService` with `worktreeAdd(path, branch)`, `worktreeRemove(path)`, `worktreeList()`. Update `AgentOrchestrator`'s startup path to request a worktree from `GitService` before executing file-writing steps, and pass the worktree path down as the effective workspace root for that run. Add cleanup on agent stop/complete. Handle the case where `GitService` detects the workspace is not a git repo at all — worktree isolation degrades to a warning-and-continue (single shared directory, same as today) rather than blocking agent execution outright.

### Phase 3 — Cross-workspace management + Inbox + merge-back

Stand up the dedicated Tauri `WebviewWindow` for the Manager route. Wire Tauri `emit`/`listen` for cross-window sync of agent status and approval events. Build the Inbox aggregation view. Build the merge-back flow: worktree branch diff via `MultiFileDiffView.tsx`, then `git merge` (or `git diff | apply`) into the main working tree on user confirmation. Conflict handling in this phase is scoped to detect-and-surface only — full in-app conflict resolution is an explicit non-goal, falling back to "open a terminal" if `git merge` reports conflicts.

## Integration points (existing code to hook into)

- `src/components/EnhancedAgentMode/stores/` (`agentModeStore.ts`) — pattern reference for the new `ManagerStore`; existing per-agent state this must aggregate across.
- `src/services/BackgroundAgentSystem.ts` — source of running-task data for the Manager list.
- `src/services/TaskQueue.ts` — per-agent queue that the worktree-scoped orchestrator instance still uses unchanged.
- `src/services/specialized-agents/AgentCoordinator.ts` and `AgentOrchestrator.ts` — gains the agent-id-to-worktree registry; orchestrator instances become addressable per agent.
- `src/services/AgentHealthMonitor.ts` — health state surfaced in the Manager list.
- `src/services/GitService.ts` — extended with worktree subcommands; existing shell-out/error-handling pattern must be followed, not duplicated.
- `src/components/TaskMonitorPanel/` — Manager's per-agent detail view can embed or reuse this panel's task-card rendering.

## Test Scenarios

- Vitest: `GitService.worktreeAdd()` constructs the correct `git worktree add <path> -b <branch>` invocation and surfaces failures (e.g., branch already exists) as typed errors.
- Vitest: `AgentOrchestrator` falls back to the shared workspace root (with a logged warning) when `GitService.worktreeAdd()` reports the workspace is not a git repository, rather than throwing and blocking agent start.
- Vitest: `AgentCoordinator` registry correctly maps a new agent id to its worktree path and orchestrator instance; removing an agent clears the mapping.
- Vitest: `ManagerStore` aggregates approval-needed events from two mock agents into a single Inbox list, ordered by timestamp.
- Vitest: `GitService.worktreeRemove()` is called on agent stop unless the "keep worktree" option was set, verified via a spy on the removal call.
- Playwright: start two agents on overlapping files from the Manager; assert two distinct worktree directories exist on disk and neither agent's diff artifact shows the other's changes.
- Playwright: answer an Inbox approval for agent A; assert agent B's status is unaffected (still `running`).
- Playwright: close the Manager window while an agent is mid-run; assert the agent's `TaskMonitorPanel` entry in the main window still shows `running` afterward.
- Playwright: trigger the merge-back action on a completed agent's worktree; assert `MultiFileDiffView.tsx` opens showing the worktree branch's changes before any merge is applied.

## Success Metrics

- 100% of new agent runs get a worktree once Phase 2 ships, with the shared-directory fallback (non-git workspace) exercised only in that specific edge case, not as a silent default.
- Zero file-write collisions between concurrently running agents (measured by absence of merge conflicts attributable to simultaneous same-file writes outside the worktree model).
- Time-to-respond to any pending agent question drops (single Inbox vs. hunting across panels).
- Manager supports N ≥ 3 concurrent agents in a workspace without UI degradation (manual perf check).
- Merge-back flow completes without manual `git` CLI intervention for >90% of single-branch, non-conflicting agent runs.
- Worktree cleanup (Acceptance Criterion 8) leaves zero orphaned `.vcs/worktrees/` directories after a full session of starting and stopping multiple agents, verified by a disk-state check at session end.

---

**Risks / Open questions**: Worktree disk usage scales with concurrent agent count on large repos — needs a cap or LRU cleanup policy. Merge-back conflict resolution UX is unspecified beyond "use `MultiFileDiffView`" — may need a dedicated conflict-resolution flow if `git merge` fails. Cross-workspace Manager (Phase 3) assumes multiple workspaces can be open simultaneously in VCS at all; confirm this is already true before committing to that scope.
**Sequencing**: Wave 2, depends on spec 05 (plan-driven dispatch feeds "start new agent" flow) and benefits from spec 09 (artifacts populate the merge-back review). Effort is large enough to consider shipping Phase 1 standalone as a quick win.
