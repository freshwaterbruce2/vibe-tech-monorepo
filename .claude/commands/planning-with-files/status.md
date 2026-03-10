---
description: Show current planning session status and recent progress
model: sonnet
---

# Planning Session Status

Display the current planning session status from persistent files.

## Step 1: Find Most Recent Session

Execute:

```bash
powershell -Command "Get-ChildItem -Path 'D:\planning-files' -Directory -Recurse -Depth 2 | Where-Object { $_.Name -match '^\d{8}-\d{6}$' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"
```


Store this path as the active session directory.

## Step 2: Read task_plan.md

Read the task_plan.md file from the session directory.

Extract and display:
- Session ID
- Project name
- Status (in_progress/completed/blocked)
- Current phase
- Phases checklist progress

## Step 3: Read progress.md

Read the progress.md file from the session directory.

Extract and display:
- Last timeline entry
- Recent actions completed (last 5)
- Any errors encountered

## Step 4: Check Dashboard Metrics

Execute:

```bash
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:3100/api/planning/sessions/active' -Method GET -ErrorAction SilentlyContinue | ConvertTo-Json -Depth 3"
```


## Step 5: Present Status Summary

Display formatted output:

```
=====================================
  PLANNING SESSION STATUS
=====================================

Session: [SESSION_ID]
Project: [PROJECT]
Status: [in_progress/completed/blocked]
Started: [TIMESTAMP]
Location: [PATH]

Current Phase: [PHASE NAME]

Phase Progress:
[x] Phase 1: Research and Analysis
[ ] Phase 2: Implementation
[ ] Phase 3: Testing and Verification
[ ] Phase 4: Documentation and Cleanup

Recent Activity (from progress.md):
- [TIMESTAMP]: [LAST ACTION]
- [TIMESTAMP]: [PREVIOUS ACTION]

Errors: [COUNT] encountered
Files Modified: [COUNT]

Quick Actions:
- /planning-with-files:update - Add progress entry
- /planning-with-files:complete - Mark session done
- /planning-with-files:recover - Restore full context

=====================================
```

**NOTE:** If no active session found, inform user:
"No active planning session found. Use /planning-with-files:start to begin."
