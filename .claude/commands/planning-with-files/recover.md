---
description: Restore context from planning files after session interruption
model: sonnet
---

# Recover Planning Context

Restore full context from the three planning files after a session interruption or context window reset.

**Announce:** "I am recovering context from the planning-with-files system."

## Step 1: Find Most Recent Session

Execute:

```bash
powershell -Command "Get-ChildItem -Path 'D:\planning-files' -Directory -Recurse -Depth 2 | Where-Object { $_.Name -match '^\d{8}-\d{6}$' } | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Format-Table Name, LastWriteTime, FullName -AutoSize"
```

If multiple sessions found, ask user which to recover.

## Step 2: Read task_plan.md

Read the entire task_plan.md file from the session directory.

Extract and internalize:

- Original objective
- Current phase
- Affected files list
- Risk assessment
- Rollback plan

## Step 3: Read findings.md

Read the entire findings.md file.

Extract and internalize:

- Research discoveries
- Existing patterns found
- Dependencies identified
- Key decisions made

## Step 4: Read progress.md

Read the entire progress.md file.

Extract and internalize:

- Timeline of actions taken
- Test results
- Errors encountered and resolutions
- Files already modified
- Next steps identified

## Step 5: Restore TodoWrite State

Based on task_plan.md phases, recreate TodoWrite items:

- Mark completed phases as done
- Mark current phase as in_progress
- Add remaining phases as pending

## Step 6: Present Recovery Summary

```
=====================================
  CONTEXT RECOVERED
=====================================

Session ID: [SESSION_ID]
Project: [PROJECT]
Objective: [OBJECTIVE]

Current Phase: [PHASE]
Progress: [X/4] phases complete

Files Already Modified:
- [FILE 1]
- [FILE 2]

Last Action: [LAST TIMELINE ENTRY]

Next Steps (from progress.md):
1. [NEXT STEP 1]
2. [NEXT STEP 2]

Ready to continue from where we left off.
=====================================
```

## Step 7: Continue Work

Ask user: "Would you like me to continue with the next step, or would you like to review the recovered context first?"

**IMPORTANT:**

- Read ALL three files before proceeding
- Verify understanding with user before continuing work
- This is the primary mechanism for surviving context window resets
