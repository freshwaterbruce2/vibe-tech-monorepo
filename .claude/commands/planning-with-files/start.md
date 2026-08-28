---
description: Initialize a new planning-with-files session for a complex task
model: sonnet
---

# Start Planning Session

Initialize a new planning-with-files session with persistent markdown files.

## Step 1: Gather Session Information

Ask the user:

1. **Project name** (or use 'workspace' for monorepo-level tasks)
2. **Task objective** (what they want to accomplish)

If not provided, detect project from current directory or git status.

## Step 2: Generate Session ID

Execute:

```bash
powershell -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"
```

Store this as the SESSION_ID.

## Step 3: Create Session Directory

Using the SESSION_ID from step 2 and the PROJECT name, create the directory:

```bash
powershell -Command "New-Item -ItemType Directory -Path 'D:\planning-files\PROJECT\SESSION_ID' -Force"
```

Replace PROJECT and SESSION_ID with actual values.

## Step 4: Copy Templates

Copy all three template files to the new session directory:

```bash
powershell -Command "Copy-Item 'D:\planning-files\_templates\*.md' 'D:\planning-files\PROJECT\SESSION_ID\'"
```

## Step 5: Initialize task_plan.md

Read the template and replace placeholders:

- {{SESSION_ID}} -> actual session ID
- {{PROJECT}} -> project name
- {{TIMESTAMP}} -> current timestamp
- {{OBJECTIVE}} -> user's task objective

Write the updated content to task_plan.md.

## Step 6: Register Session with Dashboard API

Execute (optional - only if dashboard is running):

```bash
curl -X POST http://localhost:3100/api/planning/session -H "Content-Type: application/json" -d "{\"sessionId\":\"SESSION_ID\",\"projectName\":\"PROJECT\",\"objective\":\"OBJECTIVE\",\"complexity\":\"medium\"}"
```

## Step 7: Confirm Initialization

Present to user:

```
=====================================
  PLANNING SESSION INITIALIZED
=====================================

Session ID: [SESSION_ID]
Project: [PROJECT]
Location: D:\planning-files\[project]\[SESSION_ID]
Files Created:
- task_plan.md (phases, objectives, affected files)
- findings.md (research, patterns, decisions)
- progress.md (timeline, tests, errors)

Next Steps:
1. Begin research phase - explore the codebase
2. Document findings in findings.md
3. Update task_plan.md with affected files list
4. Use /planning-with-files:status to check progress

To restore context later: /planning-with-files:recover
=====================================
```

**IMPORTANT:**

- Create TodoWrite items for each phase
- Announce: "I am using the planning-with-files skill for persistent context"
