---
name: task-management-patterns
description: High-confidence task management patterns from learning system - proven workflows with 100% success rate across 51 executions (TaskCreate + TaskUpdate)
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: TaskCreate+TaskUpdate
  executions_analyzed: 51
  avg_execution_time_ms: 27
---

# Task Management Patterns

**Auto-generated from 51 successful task management executions (19 TaskCreate + 32 TaskUpdate) with 100% success rate**

## Overview

This skill captures high-confidence task management patterns identified by the learning system. These patterns have been validated across dozens of executions in the VibeTech monorepo environment and represent the most reliable approaches for managing complex multi-step work.

## Core Capabilities

### 1. Use todo Tool for Task Lists
- Create structured task lists for complex work (3+ steps)
- Track progress with statuses: pending, in_progress, completed, cancelled
- Only ONE item in_progress at a time
- Mark items completed immediately when done

### 2. Task Creation Best Practices
- Break complex work into bite-sized tasks
- Each task should be independently verifiable
- Use descriptive IDs for easy reference
- Order by priority (highest first)

### 3. Task Update Workflow
- Update status as work progresses
- Cancel failed tasks and add revised versions
- Use merge=true to update existing items by ID
- Use merge=false (default) to replace entire list

## Usage Examples

### Example 1: Creating a task list for a feature
```bash
todo todos='[
  {"id": "setup", "content": "Set up project structure", "status": "in_progress"},
  {"id": "impl", "content": "Implement core logic", "status": "pending"},
  {"id": "test", "content": "Write tests", "status": "pending"},
  {"id": "docs", "content": "Update documentation", "status": "pending"}
]'
```

### Example 2: Updating task progress
```bash
todo todos='[
  {"id": "setup", "content": "Set up project structure", "status": "completed"},
  {"id": "impl", "content": "Implement core logic", "status": "in_progress"},
  {"id": "test", "content": "Write tests", "status": "pending"},
  {"id": "docs", "content": "Update documentation", "status": "pending"}
]' merge=true
```

### Example 3: Handling failure and revision
```bash
todo todos='[
  {"id": "impl", "content": "Implement core logic", "status": "cancelled"},
  {"id": "impl-v2", "content": "Implement core logic (revised approach)", "status": "in_progress"},
  {"id": "test", "content": "Write tests", "status": "pending"}
]' merge=true
```

### Example 4: Reading current task list
```bash
todo
```

## Integration with Monorepo

- **Session Persistence**: Task list persists across turns in same session
- **Complex Work**: Use for any task with 3+ steps or multiple user requests
- **Verification**: Each task should have clear completion criteria

## Safety Measures

1. **Single In-Progress**: Enforces only one task in_progress at a time
2. **Immediate Completion**: Mark tasks completed as soon as done
3. **Failure Handling**: Cancel failed tasks, add revised versions
4. **Audit Trail**: Full history of task state changes

## Related Skills

- `plan-writing` - Write implementation plans with bite-sized tasks
- `executing-plans` - Execute plans via delegate_task subagents
- `bash-command-patterns` - High-confidence Bash command patterns
- `task-create` - Create and manage task lists
- `task-update` - Update task progress, status, or content

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tools**: TaskCreate (19), TaskUpdate (32)
- **Total Executions**: 51
- **Successes**: 51
- **Success Rate**: 100%
- **Avg Execution Time**: 27ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0