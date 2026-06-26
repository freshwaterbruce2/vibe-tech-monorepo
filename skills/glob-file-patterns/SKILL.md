---
name: glob-file-patterns
description: High-confidence Glob file finding patterns from learning system - proven workflows with 100% success rate across 23 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: Glob
  executions_analyzed: 23
  avg_execution_time_ms: 5585
---

# Glob File Patterns

**Auto-generated from 23 successful Glob executions with 100% success rate**

## Overview

This skill captures high-confidence file pattern matching patterns identified by the learning system. These patterns have been validated across dozens of executions in the VibeTech monorepo environment and represent the most reliable approaches for finding files by name pattern.

## Core Capabilities

### 1. Use search_files with target='files' (Not ls/find)
- Find files by glob pattern (e.g., '*.py', '*config*')
- Results sorted by modification time (newest first)
- Replaces `ls`, `find`, `glob` commands
- Consistent output format

### 2. Pattern Matching
- Standard glob patterns: `*`, `?`, `[range]`, `{alt1,alt2}`
- Recursive by default
- Case-sensitive on Linux, case-insensitive on Windows/MSYS
- Use `path` parameter to limit search scope

### 3. Output Modes
- Returns file paths with modification times
- No content search (use target='content' for that)
- Limit results with `limit` parameter (default: 50)

## Usage Examples

### Example 1: Find all TypeScript files
```bash
search_files target=files pattern="*.ts" path="src/"
```

### Example 2: Find config files
```bash
search_files target=files pattern="*config*" path="."
```

### Example 3: Find test files
```bash
search_files target=files pattern="*.test.ts" path="packages/"
```

### Example 4: Find all markdown files
```bash
search_files target=files pattern="*.md" limit=20
```

### Example 5: Find files by extension group
```bash
search_files target=files pattern="*.{ts,tsx,js,jsx}" path="apps/"
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Projects**: 52+ projects across 5 categories
- **Structure**: apps/, packages/, tools/, scripts/
- **Performance**: Faster than shell `find` or `ls`

## Safety Measures

1. **Performance**: Built-in limits (50 results default)
2. **Sorting**: Results by modification time (newest first)
3. **Scope**: Use `path` to limit search scope
4. **No Content Search**: Use target='content' for content search

## Related Skills

- `grep-search-patterns` - High-confidence grep/content search patterns
- `file-read-patterns` - High-confidence file reading patterns
- `bash-command-patterns` - High-confidence Bash command patterns
- `glob-operations` - Find files by name pattern with search_files

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Glob
- **Total Executions**: 23
- **Successes**: 23
- **Success Rate**: 100%
- **Avg Execution Time**: 5,585ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0