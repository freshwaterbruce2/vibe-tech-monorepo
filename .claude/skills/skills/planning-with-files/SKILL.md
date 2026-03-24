---
name: planning-with-files
description: Use for complex multi-file tasks to maintain persistent context through markdown files (task_plan.md, findings.md, progress.md) stored on disk.
---

# Planning With Files

## Overview

A context engineering methodology that treats **filesystem as persistent memory**. For complex tasks, maintain 3 persistent markdown files that survive context window resets.

**Core Principle:** Context Window = RAM (volatile) | Filesystem = Disk (persistent)

**Announce at start:** "I am using the planning-with-files skill to maintain persistent context for this task."

## When to Use

Use this skill when:

- Task involves modifying 3+ files
- Task spans multiple sessions
- Task is marked as NEW_FEATURE, BREAKING_CHANGE, or HIGH complexity
- User explicitly requests planning workflow
- Previous similar tasks experienced context loss

## The Three Files

### 1. task_plan.md

**Purpose:** Track phases, objectives, and affected files

Contains:

- Session metadata (ID, project, timestamp)
- Task objective (original request)
- Phase checklist (Research -> Implementation -> Testing -> Documentation)
- Affected files table with action/status
- Risk assessment and rollback plan

### 2. findings.md

**Purpose:** Store research discoveries and decisions

Contains:

- Research summary table (topic, source, findings)
- Existing patterns found in codebase
- Similar implementations identified
- Dependencies and constraints discovered
- Key decisions with rationale

### 3. progress.md

**Purpose:** Session log with test results and errors

Contains:

- Timeline with timestamped entries
- Actions completed table
- Test results table
- Errors encountered with resolutions
- Files modified with change types
- Next steps checklist

## Workflow

### Step 1: Initialize Session

1. Generate session ID: YYYYMMDD-HHMMSS
2. Create session directory: `D:\planning-files\[project]\[session-id]\`
3. Copy templates from `D:\planning-files\_templates\`
4. Fill in task_plan.md with objective and initial assessment

### Step 2: Research Phase

1. Explore codebase to understand existing patterns
2. Document findings in findings.md as you discover them
3. Update task_plan.md with:
   - Affected files list
   - Complexity assessment
   - Rollback plan
4. Log research actions in progress.md timeline

### Step 3: Implementation Phase

1. Check task_plan.md before each file modification
2. Update progress.md after each significant action
3. Record any errors encountered with resolutions
4. Mark phases complete as you progress

### Step 4: Testing Phase

1. Run relevant tests and record results in progress.md
2. Log any failures with debugging steps taken
3. Update task_plan.md phase status

### Step 5: Complete Session

1. Mark task_plan.md status as completed or blocked
2. Fill in final progress.md summary
3. Record any follow-up tasks needed

## Context Recovery

If context is lost mid-task:

1. Find active session in `D:\planning-files\[project]\`
2. Read all three files to restore context
3. Continue from last progress.md entry

**Recovery command:** /planning-with-files:recover

## Integration with Existing Tools

### TodoWrite Integration

- Create TodoWrite items from task_plan.md phases
- Mark todos complete as phases complete
- Keep files and todos synchronized

### Dashboard Metrics

- Sessions tracked in D:\databases\dashboard.db
- Metrics visible at /api/planning/metrics
- Trial comparison at /api/planning/comparison

## Best Practices

1. **Update files as you work** - Do not wait until the end
2. **Be specific in findings** - Include file paths and line numbers
3. **Log errors immediately** - Capture error messages verbatim
4. **Mark phases complete** - Keep task_plan.md current
5. **Use timestamps** - Makes debugging easier
6. **Include test commands** - Document how to verify

## Related Commands

- /planning-with-files:start - Initialize new session
- /planning-with-files:status - Show current session status
- /planning-with-files:update - Add entry to progress.md
- /planning-with-files:complete - Mark session complete
- /planning-with-files:recover - Restore context from files
- /planning-with-files:report - Generate effectiveness report

## Metrics Tracked

During the 1-month trial:

- Task completion rate
- Goal adherence rate
- Context recovery success
- Error reduction vs baseline
- Files per task average
- Session duration

**Success criteria:** +15% task completion, 85%+ goal adherence, 90%+ recovery success, -20% errors
