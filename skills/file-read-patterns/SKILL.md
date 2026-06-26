---
name: file-read-patterns
description: High-confidence file reading patterns from learning system - proven workflows with 100% success rate across 312 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: Read
  executions_analyzed: 312
  avg_execution_time_ms: 97
---

# File Read Patterns

**Auto-generated from 312 successful Read executions with 100% success rate**

## Overview

This skill captures high-confidence file reading patterns identified by the learning system. These patterns have been validated across hundreds of executions in the VibeTech monorepo environment and represent the most reliable approaches for reading file contents.

## Core Capabilities

### 1. Use read_file Tool (Not cat/head/tail)
- Consistent output format with line numbers
- Built-in pagination with offset/limit
- Auto-extracts Jupyter notebooks, Word docs, Excel workbooks
- Handles large files efficiently (~100K char limit with pagination)

### 2. Pagination Best Practices
- Default: 500 lines per read
- Maximum: 2000 lines per read
- Use offset for large files (1-indexed line numbers)
- Read specific sections instead of entire files

### 3. Path Handling
- Accepts absolute, relative, and ~/ paths
- Works with MSYS paths: `/c/Users/...` or `/v/monorepo/...`
- Suggests similar filenames if not found

## Usage Examples

### Example 1: Reading a source file with pagination
```bash
# Instead of: cat src/file.ts | head -50
# Use:
read_file path="src/file.ts" offset=1 limit=50
```

### Example 2: Reading middle section of large file
```bash
# Read lines 100-200
read_file path="src/large-file.ts" offset=100 limit=100
```

### Example 3: Reading config files
```bash
# Read entire config (small files)
read_file path="config.yaml"
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Data Drive**: `D:/` for databases, logs, backups
- **File Types**: Auto-extracts .ipynb, .docx, .xlsx to readable text

## Safety Measures

1. **Validation**: Cannot read binary files (images, etc.) - use vision_analyze instead
2. **Size Limits**: Automatic truncation at ~100K characters
3. **Encoding**: UTF-8 assumed, handles BOM

## Related Skills

- `file-write-patterns` - High-confidence file writing patterns
- `file-edit-patterns` - High-confidence file editing patterns
- `bash-command-patterns` - High-confidence Bash command patterns
- `read-operations` - Read files with the read_file tool

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Read
- **Total Executions**: 312
- **Successes**: 312
- **Success Rate**: 100%
- **Avg Execution Time**: 97ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0