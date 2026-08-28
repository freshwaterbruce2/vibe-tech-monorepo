---
name: file-write-patterns
description: High-confidence file writing patterns from learning system - proven workflows with 100% success rate across 54 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: Write
  executions_analyzed: 54
  avg_execution_time_ms: 4476
---

# File Write Patterns

**Auto-generated from 54 successful Write executions with 100% success rate**

## Overview

This skill captures high-confidence file writing patterns identified by the learning system. These patterns have been validated across dozens of executions in the VibeTech monorepo environment and represent the most reliable approaches for creating and replacing files.

## Core Capabilities

### 1. Use write_file Tool (Not echo/cat/heredoc)
- Completely replaces existing content (use patch for targeted edits)
- Creates parent directories automatically
- Auto-runs syntax checks on .py/.json/.yaml/.toml and other linted languages
- Only NEW errors introduced by this write are surfaced (pre-existing errors filtered out)

### 2. Writing Best Practices
- Always write complete file content (not incremental)
- Use for: new files, config files, generated code, documentation
- Use patch for: small changes to existing files
- Large files: Consider breaking into multiple writes or using patch

### 3. Cross-Profile Protection
- Default: Blocks writes to other Hermes profiles' skills/plugins/cron/memories
- Use `cross_profile=true` ONLY after explicit user direction
- Protects: `~/.hermes/profiles/<name>/skills/`, `plugins/`, `cron/`, `memories/`

## Usage Examples

### Example 1: Creating a new config file
```bash
write_file path="config/new-service.yaml" content="
service:
  name: my-service
  port: 8080
  database:
    host: localhost
    port: 5432
"
```

### Example 2: Writing a TypeScript module
```bash
write_file path="src/generated/types.ts" content="
export interface User {
  id: string;
  name: string;
  email: string;
}

export type UserRole = 'admin' | 'user' | 'guest';
"
```

### Example 3: Creating documentation
```bash
write_file path="docs/api-guide.md" content="
# API Guide

## Authentication
Use Bearer token in Authorization header.

## Endpoints
- GET /users - List users
- POST /users - Create user
"
```

### Example 4: Cross-profile write (with explicit permission)
```bash
write_file path="~/.hermes/profiles/work/skills/new-skill/SKILL.md" content="..." cross_profile=true
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo` (mounted as `/v/monorepo` in MSYS)
- **Languages**: TypeScript 5.9, Python 3.11, JSON, YAML, TOML, Markdown
- **Syntax Checks**: Auto-run on linted languages
- **Pre-existing Errors**: Filtered out, only NEW errors surfaced

## Safety Measures

1. **Syntax Validation**: Auto-runs on .py/.json/.yaml/.toml and other linted languages
2. **Directory Creation**: Automatic parent directory creation
3. **Cross-Profile Guard**: Soft guard prevents accidental writes to other profiles
4. **Atomic Write**: Complete replacement or no change
5. **No Streaming**: Entire content must be provided (no append mode)

## Related Skills

- `file-read-patterns` - High-confidence file reading patterns
- `file-edit-patterns` - High-confidence file editing patterns
- `patch-operations` - Targeted find-and-replace edits
- `write-operations` - Create or completely replace files

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: Write
- **Total Executions**: 54
- **Successes**: 54
- **Success Rate**: 100%
- **Avg Execution Time**: 4,476ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0