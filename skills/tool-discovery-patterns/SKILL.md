---
name: tool-discovery-patterns
description: High-confidence tool discovery patterns from learning system - proven workflows with 100% success rate across 18 executions
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_tool_analysis
  success_rate: 1.0
  category: devops
  source_tool: ToolSearch
  executions_analyzed: 18
  avg_execution_time_ms: 33
---

# Tool Discovery Patterns

**Auto-generated from 18 successful ToolSearch executions with 100% success rate**

## Overview

This skill captures high-confidence tool discovery patterns identified by the learning system. These patterns have been validated across executions in the VibeTech monorepo environment and represent the most reliable approaches for finding available tools, skills, and capabilities.

## Core Capabilities

### 1. Use tool_search Tool (Not manual exploration)
- Search available tools, skills, and toolsets
- Returns structured information about capabilities
- Helps discover new tools for tasks
- Integrates with skill system

### 2. Search Capabilities
- Find tools by name or description
- Filter by toolset/category
- Discover skill availability
- Check tool parameters and usage

### 3. Best Practices
- Search before assuming tool availability
- Use descriptive queries for better matches
- Check skill prerequisites before use
- Verify tool compatibility with current task

## Usage Examples

### Example 1: Search for file-related tools
```bash
tool_search query="file read write edit"
```

### Example 2: Find web search tools
```bash
tool_search query="web search extract"
```

### Example 3: Discover skills for a domain
```bash
tool_search query="database sql query"
```

### Example 4: Find MCP tools
```bash
tool_search query="mcp server client"
```

## Integration with Monorepo

- **Tool Registry**: Integrated with Hermes tool system
- **Skills**: Discovers skills in `~/.hermes/skills/` and project `.agent/skills/`
- **MCP Servers**: Finds tools from configured MCP servers
- **Dynamic**: Reflects current session's available tools

## Safety Measures

1. **Read-Only**: Discovery only, no side effects
2. **Current Session**: Reflects tools available in current context
3. **Accurate**: Returns actual tool schemas and descriptions

## Related Skills

- `skill-discovery` - Find and load skills for tasks
- `bash-command-patterns` - High-confidence Bash command patterns
- `tool-search` - Search for available tools, skills
- `learning-pipeline-operations` - Manage learning pipeline operations

## Generation Metadata

- **Source**: Learning system agent_executions table
- **Tool**: ToolSearch
- **Total Executions**: 18
- **Successes**: 18
- **Success Rate**: 100%
- **Avg Execution Time**: 33ms
- **Last Analyzed**: 2026-06-18
- **Confidence**: 1.0