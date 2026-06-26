# Ralph/RLM Loop Engineering

The Ralph/RLM architecture replaces long-lived conversational agent sessions with short, fresh-context loops orchestrated by a lightweight outer process. This document defines how the paradigm is implemented in the VibeTech monorepo.

## Why Loops?

Long-context agents degrade as their context windows fill. Past 100k–150k tokens, attention dilutes, auto-compaction loses detail, and models drift from original specifications. A Ralph loop avoids this by:

- Starting every iteration with a clean context.
- Keeping immutable specifications in `specs/*.md`.
- Tracking mutable state in `task_plan.md`.
- Logging every iteration in `progress.md`.

## Loop Anatomy

A Ralph loop run consists of:

1. **Orient** — Load specs and current task plan.
2. **Select** — Pick the next pending task.
3. **Implement** — Execute the task in a fresh session.
4. **Validate** — Run the narrowest relevant verification command.
5. **Update** — Write the updated task plan and append progress.
6. **Repeat** — Continue until a termination gate fires.

## Termination Gates

Every loop must declare hard boundaries:

- Maximum iteration count.
- Maximum estimated cost in USD.
- Assertion command that must pass.
- Explicit `done` flag in the task plan.

## Catalog (Monorepo-Relevant Subset)

| Loop                           | Purpose                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Fresh-Clone Loop               | Verify onboarding instructions from a bare environment.                      |
| Sub-50 ms Page-Load Loop       | Optimize every page load under identical conditions.                         |
| Clodex Adversarial-Review Loop | Builder opens a PR; critic runs diagnostics until severity threshold passes. |
| Ticket-to-PR-Ready Loop        | Reproduce failure, apply narrow fix, prove red-on-revert / green-on-patch.   |

## Tooling

- `tools/ralph-loop/` — Fresh-context orchestrator and durable-state manager.
- `tools/ralph-loop/bin/ralph.ps1` — PowerShell entry point.
- `tools/kimi-code-provider/` — OpenAI-compatible provider for Kimi K2.7 Code.

## Usage

```powershell
# Start the Kimi provider
.\tools\kimi-code-provider\bin\kimi-provider.ps1 -ApiKey $env:KIMI_API_KEY

# Run a Ralph loop
.\tools\ralph-loop\bin\ralph.ps1 `
  -SpecsDir .\tools\ralph-loop\specs `
  -TaskPlan .\tools\ralph-loop\task_plan.json `
  -Progress .\tools\ralph-loop\progress.md
```

## Rules

- Never mutate `specs/*.md` during a loop run.
- Always commit `task_plan.md` and `progress.md` at logical checkpoints.
- Keep each iteration focused on a single task.
- Write the "why" into test docstrings and code comments for future archaeology.
