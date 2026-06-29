---
name: session-handoff
description: Prepare a consistent session handoff update for Memory Bank files
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
argument-hint: "[--task \"summary\"] [--project <name>] [--dry-run]"
---

# Session Handoff

Create or update handoff context so the next session can resume quickly.

## Defaults

- Root memory bank path: `V:\monorepo\memory-bank`
- Handoff file: `next-session-prompt.md`
- Related files to update:
  - `activeContext.md`
  - `progress.md` (append milestone entry if work completed)

## Steps

1. Parse arguments:
   - optional `--task` summary
   - optional `--project` for app-specific context
   - optional `--dry-run`
2. Read current `activeContext.md`, `progress.md`, and `next-session-prompt.md` (if present).
3. Generate a handoff payload with:
   - what was done
   - decisions made
   - blockers
   - exact next steps
4. If `--dry-run` is set, print the proposed edits only.
5. Otherwise:
   - update `next-session-prompt.md`
   - update `activeContext.md` current task/status/next steps
   - append to `progress.md` only if there is a completed milestone
6. Confirm changed files and summarize next action for the next session.

## Output Format

```text
Session Handoff
===============
Updated files:
- <file>

Next-session summary:
- <bullet>

Immediate next step:
- <bullet>
```
