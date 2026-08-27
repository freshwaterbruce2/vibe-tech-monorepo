---
name: grep-search-patterns
description: High-confidence grep/content search patterns from learning system - proven workflows with 100% success rate across 90 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: Grep
  executions_analyzed: 90
  avg_execution_time_ms: 1505
---

# Grep Search Patterns

**Auto-generated from 90 successful Grep executions with 100% success rate**

## Overview

This skill captures high-confidence content search patterns identified by the learning system. These patterns have been validated across dozens of executions in the VibeTech monorepo environment and represent the most reliable approaches for searching file contents.

## Core Capabilities

### 1. Use search_files Tool (Not grep/rg/find)
- Ripgrep-backed, faster than shell equivalents
- Consistent output formats
- Multiple output modes: content, files_only, count
- Regex pattern support
- Context lines before/after matches

### 2. Search Modes
- **Content Search** (target='content'): Regex search inside files
  - Output modes: 'content' (matches with line numbers), 'files_only', 'count'
- **File Search** (target='files'): Find files by glob pattern
  - Also use instead of `ls` — results sorted by modification time

### 3. Filtering Options
- `file_glob`: Filter files by pattern (e.g., '*.py' to only search Python files)
- `path`: Directory or file to search in (default: current working directory)
- `limit`: Maximum results (default: 50)
- `context`: Context lines before/after each match (default: 0)

## Usage Examples

### Example 1: Search for a pattern in TypeScript files
```bash
search_files target=content pattern="interface.*User" file_glob="*.ts" path="src/"
```

### Example 2: Find all config files
```bash
search_files target=files pattern="*config*" path="."
```

### Example 3: Count matches per file
```bash
search_files target=content pattern="TODO" output_mode=count
```

### Example 4: Search with context
```bash
search_files target=content pattern="error" context=3 file_glob="*.log"
```

### Example 5: Case-insensitive search
```bash
search_files target=content pattern="(?i)error" file_glob="*.ts"
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Codebase**: 52+ projects across 5 categories
- **Package Manager**: pnpm 9.15.0 workspace
- **Search Speed**: Ripgrep-backed, faster than shell equivalents

## Safety Measures

1. **Performance**: Built-in limits (50 results default, configurable)
2. **Encoding**: UTF-8 assumed
3. **Binary Files**: Automatically skipped
4. **Regex Safety**: Uses ripgrep's safe regex engine

## Related Skills

- `glob-file-patterns` - High-confidence Glob file finding patterns
- `file-read-patterns` - High-confidence file reading patterns
- `bash-command-patterns` - High-confidence Bash command patterns
- `grep-operations` - Search file contents with search_files tool

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Grep
- **Total Executions**: 90
- **Successes**: 90
- **Success Rate**: 100%
- **Avg Execution Time**: 1,505ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0