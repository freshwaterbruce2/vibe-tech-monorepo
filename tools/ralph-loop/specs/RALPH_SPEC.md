# Ralph Loop Orchestrator

## Objective

Provide a local-first, fresh-context loop engine for autonomous monorepo tasks.

## Principles

1. **Immutable specs**: `specs/*.md` files are read-only for the duration of a loop run.
2. **Mutable checkpoint**: `task_plan.json` carries the current phase, task list, and accumulated context.
3. **Session log**: `progress.md` records every iteration outcome with an ISO timestamp.
4. **Bounded termination**: Every loop declares max iterations and a cost budget up front.
5. **Fresh context**: The orchestrator may spawn each iteration as a new process or worktree.

## Loop Steps

1. Load all `specs/*.md` files.
2. Load `task_plan.json` (create default if missing).
3. Evaluate termination gates.
4. Call provider with specs + task plan + progress.
5. Persist returned task plan and append log entry.
6. Repeat from step 3.

## Termination Gates

- Task plan `done` flag is true.
- Maximum iterations exceeded.
- Cost budget exceeded.
- Optional assertion command fails.

## Provider Contract

Providers receive:

```json
{
  "specs": [{ "id": "...", "objective": "...", "content": "..." }],
  "taskPlan": { "phase": "...", "tasks": [], "context": {}, "done": false },
  "progress": ["[2026-...] entry"],
  "iteration": 1
}
```

Providers return:

```json
{
  "updatedTaskPlan": { ... },
  "logEntry": "Completed orient phase",
  "costUsd": 0.01
}
```
