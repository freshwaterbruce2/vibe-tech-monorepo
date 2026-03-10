# Nx Workspace Management Commands

This directory contains 7 comprehensive Nx workspace management commands for the C:\dev monorepo.

## Available Commands

### Core Commands (Existing)

1. **`/nx:affected [task]`** - Run tasks only on affected projects
   - Intelligently detects changes since base branch
   - Runs optional task (build, test, lint, etc.)
   - Shows performance summary with cache statistics

2. **`/nx:cache-clear [deep]`** - Clear Nx cache
   - Standard or deep cache clearing
   - Shows cache size before/after
   - Provides next build behavior information

3. **`/nx:graph`** - Visualize dependencies
   - Opens interactive dependency graph
   - Shows affected projects
   - Provides workspace insights

### New Commands (Created 2025-12-08)

1. **`/nx:workspace-health`** - Comprehensive workspace diagnostics
   - Checks for circular dependencies
   - Identifies orphaned projects
   - Validates project configurations
   - Analyzes cache efficiency
   - Verifies Nx Cloud connection
   - Git integration health
   - Overall health score

2. **`/nx:project-info <project-name>`** - Deep project analysis
   - Shows all targets and configurations
   - Lists dependencies and dependents
   - Displays cache status
   - Shows build inputs/outputs
   - Git activity analysis
   - Project health check

3. **`/nx:run-many <target> [projects]`** - Multi-project task execution
   - Filter by project patterns
   - Parallel execution (default: 3 concurrent)
   - Real-time progress tracking
   - Detailed execution summary
   - Failure analysis

4. **`/nx:cloud-status`** - Nx Cloud monitoring
   - Connection status verification
   - Remote cache statistics
   - Recent pipeline executions
   - Detailed run and task analysis
   - Team collaboration metrics
   - Performance recommendations

## Command Registration

### How Commands Are Registered

Commands are **automatically discovered** from `.md` files in the `.claude/commands/` directory structure.

**Important:** Claude Code caches slash commands when first loaded. New commands require a **restart** to be recognized.

### Registration Checklist

- [x] Files created in `.claude/commands/nx/` directory
- [x] YAML frontmatter properly formatted
- [x] Commands follow best practices
- [x] list-commands.md updated with new commands
- [ ] **Claude Code restart required**

## Command Format

All commands follow this structure:

```markdown
---
allowed-tools: Bash(nx:*), Bash(git:*), mcp__nx-mcp__nx_workspace
description: Brief description of what the command does
argument-hint: <required> [optional]
model: sonnet
---

# Command Title

Step-by-step execution instructions...
```

### YAML Frontmatter Fields

- **`allowed-tools`**: List of tools the command can use (Bash patterns, MCP tools)
- **`description`**: One-line description shown in command listings
- **`argument-hint`**: Parameter format (optional field)
- **`model`**: AI model to use (typically `sonnet`)

## Usage Examples

```bash
# Workspace diagnostics
/nx:workspace-health

# Deep dive into specific project
/nx:project-info digital-content-builder
/nx:project-info crypto-enhanced

# Run tasks on affected projects
/nx:affected build
/nx:affected test

# Run tasks across multiple projects
/nx:run-many build                    # All projects
/nx:run-many test app1,app2           # Specific projects
/nx:run-many lint                     # All projects

# Cache management
/nx:cache-clear                       # Standard clear
/nx:cache-clear deep                  # Deep clear

# Visualization and monitoring
/nx:graph                             # Dependency graph
/nx:cloud-status                      # Nx Cloud metrics
```

## Integration with Nx MCP Server

These commands leverage the Nx MCP server tools:

- `mcp__nx-mcp__nx_workspace` - Get workspace structure
- `mcp__nx-mcp__nx_project_details` - Get project configuration
- `mcp__nx-mcp__nx_cloud_cipe_details` - CI pipeline execution details
- `mcp__nx-mcp__nx_cloud_pipeline_executions_search` - Search pipelines
- `mcp__nx-mcp__nx_cloud_runs_search` - Search runs
- `mcp__nx-mcp__nx_cloud_tasks_search` - Search tasks

Enable Nx MCP server in `.claude/settings.local.json`:

```json
{
  "enabledMcpjsonServers": ["nx-mcp", "filesystem", "sqlite"]
}
```

## Production Standards

All commands follow the AGENTS.md production standards:

- Comprehensive error handling
- Performance metrics and optimization tips
- Cross-references to related commands
- Visual headers with consistent formatting
- Safe, read-only operations (except run-many)
- Integration with monorepo workflow

## Troubleshooting

### Commands Not Recognized

**Problem:** `Unknown slash command: nx:workspace-health`

**Solution:** Claude Code caches commands on startup. Restart Claude Code to pick up new commands.

### Permission Errors

**Problem:** Command fails with permission errors

**Solution:** Check `allowed-tools` in YAML frontmatter matches the tools used in the command. Update `.claude/settings.json` if needed.

### MCP Server Not Available

**Problem:** Command can't access Nx MCP tools

**Solution:**

1. Check `.claude/settings.local.json` has `"nx-mcp"` in `enabledMcpjsonServers`
2. Verify `.mcp.json` configuration
3. Restart Claude Code

## Command Development Workflow

1. **Create** `.md` file in appropriate directory
2. **Format** with proper YAML frontmatter
3. **Write** step-by-step execution instructions
4. **Test** format matches existing commands
5. **Update** `list-commands.md`
6. **Restart** Claude Code
7. **Verify** command appears in `/list-commands`

## Performance Characteristics

- **workspace-health**: 30-60 seconds (comprehensive diagnostics)
- **project-info**: 5-10 seconds (single project analysis)
- **run-many**: Varies by task and project count
- **affected**: 10-30 seconds (depends on changes)
- **cache-clear**: 1-5 seconds
- **graph**: 2-5 seconds (opens browser)
- **cloud-status**: 15-30 seconds (fetches from API)

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Command system architecture
- [SLASH_COMMAND_BEST_PRACTICES.md](../SLASH_COMMAND_BEST_PRACTICES.md) - Best practices
- [CLAUDE.md](../../../CLAUDE.md) - Monorepo workflow
- [nx.json](../../../nx.json) - Nx workspace configuration

## Support

For issues or questions:

- Check `/list-commands` for all available commands
- Run `/nx:workspace-health` for diagnostics
- Review SLASH_COMMAND_BEST_PRACTICES.md
- Check Nx docs: <https://nx.dev>
