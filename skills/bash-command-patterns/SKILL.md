---
name: bash-command-patterns
description: High-confidence Bash command patterns from learning system - proven workflows with 98.74% success rate across 317 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 0.9874
  category: devops
  source_tool: Bash
  executions_analyzed: 317
  avg_execution_time_ms: 17578
---

# Bash Command Patterns

**Auto-generated from 317 successful Bash executions with 98.74% success rate**

## Overview

This skill captures high-confidence Bash command patterns identified by the learning system. These patterns have been validated across hundreds of executions in the VibeTech monorepo environment and represent the most reliable approaches for common shell operations.

## Core Capabilities

### 1. Safe File Operations
- Use `read_file` tool instead of `cat`/`head`/`tail` for consistent output
- Use `search_files` instead of `grep`/`rg`/`find` for content and file searching
- Use `patch` instead of `sed`/`awk` for targeted file edits
- Use `write_file` for creating files (auto-creates parent directories)

### 2. Process Management
- Prefer foreground commands with generous timeouts over background wrappers
- Use `terminal(background=true, notify_on_complete=true)` for long-running tasks
- Use `process(action="wait")` to block until completion
- Avoid `nohup`, `disown`, `setsid`, or trailing `&` in foreground mode

### 3. Path Handling (Windows/MSYS)
- Use POSIX paths: `/c/Users/<user>/...` or `/v/monorepo/...`
- Never use PowerShell builtins (`Get-ChildItem`, `$env:FOO`, `Select-String`)
- Use `$HOME` for user home directory, not machine hostname

### 4. Package Management
- **ALWAYS use `pnpm`** (never `npm` or `yarn`)
- Use `pnpm exec` for binary execution
- Use `pnpm --filter <package>` for scoped commands

## Usage Examples

### Example 1: Searching for patterns in codebase
```bash
# Instead of: grep -r "pattern" src/
# Use:
search_files target=content pattern="pattern" file_glob="*.ts" path="src/"
```

### Example 2: Reading a file with pagination
```bash
# Instead of: cat file.ts | head -50
# Use:
read_file path="src/file.ts" offset=1 limit=50
```

### Example 3: Making targeted edits
```bash
# Instead of: sed -i 's/old/new/g' file.ts
# Use:
patch mode=replace path="src/file.ts" old_string="old" new_string="new"
```

### Example 4: Running long-running build
```bash
# Instead of: nohup pnpm build &
# Use:
terminal command="pnpm build" timeout=300 background=true notify_on_complete=true
# Then wait:
process action="wait" session_id=<returned_id>
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Data Drive**: `D:/` for databases, logs, backups
- **Package Manager**: pnpm 9.15.0 workspace
- **Build System**: Nx 21.6+
- **TypeScript**: 5.9 with strict mode

## Safety Measures

1. **Validation**: All file writes auto-run syntax checks for .ts/.json/.yaml/.toml
2. **Snapshots**: D:/ drive has automated snapshots for rollback
3. **Path Policy**: Enforce MSYS paths in terminal, Windows paths in docs
4. **No Destructive Operations**: Pattern avoids `rm -rf`, `git reset --hard` without confirmation

## Related Skills

- `file-read-patterns` - High-confidence file reading patterns
- `file-write-patterns` - High-confidence file writing patterns
- `grep-search-patterns` - High-confidence grep/content search patterns
- `bash-operations` - Execute bash commands on Linux/WSL/macOS
- `bash-linux` - Bash/Linux terminal patterns

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Bash
- **Total Executions**: 317
- **Successes**: 313
- **Success Rate**: 98.74%
- **Avg Execution Time**: 17,579ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 0.99