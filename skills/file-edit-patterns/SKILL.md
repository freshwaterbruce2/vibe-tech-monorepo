---
name: file-edit-patterns
description: High-confidence file editing patterns from learning system - proven workflows with 100% success rate across 226 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: Edit
  executions_analyzed: 226
  avg_execution_time_ms: 239
---

# File Edit Patterns

**Auto-generated from 226 successful Edit executions with 100% success rate**

## Overview

This skill captures high-confidence file editing patterns identified by the learning system. These patterns have been validated across hundreds of executions in the VibeTech monorepo environment and represent the most reliable approaches for making targeted file modifications.

## Core Capabilities

### 1. Use patch Tool (Not sed/awk)
- Targeted find-and-replace with fuzzy matching (9 strategies)
- Minor whitespace/indentation differences won't break it
- Returns unified diff for verification
- Auto-runs syntax checks after editing (.py/.json/.yaml/.toml/etc.)

### 2. Two Edit Modes
- **REPLACE MODE** (default): Find unique string and replace it
  - Requires: mode, path, old_string, new_string
  - Use `replace_all=true` for multiple occurrences
- **PATCH MODE**: Apply V4A multi-file patches for bulk changes
  - Requires: mode, patch (V4A format)

### 3. Best Practices
- Include surrounding context lines to ensure uniqueness
- Use empty string `''` for new_string to delete matched text
- old_string must be unique unless replace_all=true
- Auto-runs syntax checks on linted languages

## Usage Examples

### Example 1: Simple string replacement
```bash
patch mode=replace path="src/config.ts" old_string="const PORT = 3000;" new_string="const PORT = 4000;"
```

### Example 2: Replacing a function
```bash
patch mode=replace path="src/utils.ts" old_string="export function add(a, b) {\n  return a + b;\n}" new_string="export function add(a: number, b: number): number {\n  return a + b;\n}"
```

### Example 3: Delete a line
```bash
patch mode=replace path="src/file.ts" old_string="console.log('debug');\n" new_string=""
```

### Example 4: Multi-file patch
```bash
patch mode=patch patch="
*** Begin Patch
*** Update File: src/a.ts
@@
-const x = 1;
+const x = 2;
*** Update File: src/b.ts
@@
-const y = 1;
+const y = 2;
*** End Patch
"
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Languages**: TypeScript 5.9, Python 3.11, JSON, YAML, TOML
- **Syntax Checks**: Auto-run after edits for linted languages
- **Pre-existing Errors**: Filtered out, only NEW errors surfaced

## Safety Measures

1. **Validation**: Fuzzy matching prevents whitespace/indentation issues
2. **Syntax Checks**: Auto-run on .py/.json/.yaml/.toml and other linted languages
3. **Preview**: Returns unified diff before applying
4. **Atomic**: Complete replacement or no change
5. **Cross-profile Guard**: Protected from editing other Hermes profiles

## Related Skills

- `file-read-patterns` - High-confidence file reading patterns
- `file-write-patterns` - High-confidence file writing patterns
- `bash-command-patterns` - High-confidence Bash command patterns
- `edit-operations` - Edit files with the patch tool

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Edit
- **Total Executions**: 226
- **Successes**: 226
- **Success Rate**: 100%
- **Avg Execution Time**: 239ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0