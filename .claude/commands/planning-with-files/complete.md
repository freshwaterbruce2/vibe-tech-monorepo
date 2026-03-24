---
description: Mark the current planning session as complete
model: sonnet
---

# Complete Planning Session

Mark the current planning-with-files session as completed and record final metrics.

## Step 1: Find Active Session

Execute:

```bash
powershell -Command "Get-ChildItem -Path 'D:\planning-files' -Directory -Recurse -Depth 2 | Where-Object { $_.Name -match '^\d{8}-\d{6}$' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"
```

## Step 2: Read Current State

Read the task_plan.md from the session directory to understand:

- How many phases were completed
- Which files were modified
- Overall task status

## Step 3: Update task_plan.md

Change the status field:

- `in_progress` -> `completed`

Mark all phases as complete if applicable.

## Step 4: Finalize progress.md

Add final entry to the timeline:

- `[TIMESTAMP]: Session completed`

Add summary section with:

- Total files modified
- Total errors encountered
- Total duration

## Step 5: Update Dashboard API

Execute (optional):

```bash
curl -X PUT "http://localhost:3100/api/planning/session/SESSION_ID/complete" -H "Content-Type: application/json" -d "{\"status\":\"completed\",\"goalMet\":true,\"filesModified\":0,\"errorsEncountered\":0}"
```

## Step 6: Present Completion Summary

```
=====================================
  PLANNING SESSION COMPLETED
=====================================

Session ID: [SESSION_ID]
Project: [PROJECT]
Duration: [DURATION]

Phases Completed: [X/4]
Files Modified: [COUNT]
Errors Encountered: [COUNT]

Session Files Location:
D:\planning-files\[project]\[SESSION_ID]\

Metrics recorded for trial evaluation.

=====================================
```

**NOTE:** Session files are preserved for later reference and metrics analysis.
