# Monorepo Automation Plugin

Comprehensive automation plugin for VibeTech Nx monorepo with 12 specialized agents covering quality, maintenance, project management, and deployment workflows.

## Overview

This plugin provides intelligent automation across your entire monorepo (52+ projects) with proactive agents that understand your workspace structure and workflows.

## Features

### 🛡️ Quality & Testing (3 Agents)

- **pre-commit-quality-gate** - Blocks commits with quality issues
- **affected-projects-tester** - Tests only what changed (Nx-powered)
- **cross-project-type-checker** - TypeScript validation across projects

### 🔧 Maintenance (3 Agents)

- **dependency-update-coordinator** - Safe one-at-a-time updates with testing
- **documentation-sync-agent** - Keeps docs in sync with code
- **dead-code-detector** - Finds unused exports and components

### 📊 Project Management (3 Agents)

- **nx-cache-optimizer** - Analyzes and optimizes cache performance
- **workspace-health-monitor** - Monitors monorepo health metrics
- **release-notes-generator** - Generates changelogs from commits

### 🚀 Build & Deploy (3 Agents)

- **mobile-deployment-agent** - Android/iOS builds (Capacitor)
- **desktop-release-agent** - Electron/Tauri packaging
- **backend-deployment-orchestrator** - Backend service deployments

## Installation

This plugin is already installed at:

```
C:\dev\.claude\plugins\monorepo-automation\
```

The plugin will be automatically discovered by Claude Code when you restart.

## Usage

### Commands

All agents have corresponding slash commands:

```bash
# Quality & Testing
/quality-gate [--fix] [--projects=<list>]
/test-affected [--parallel] [--verbose]
/typecheck-all [--fix] [--projects=<list>]

# Maintenance
/update-deps [scope] [--dry-run]
/sync-docs [--projects=<list>]
/find-dead-code [project]

# Project Management
/optimize-cache [--report]
/workspace-health [--verbose]
/generate-changelog <version> [--since=<tag>]

# Build & Deploy
/deploy-mobile <app> [--platform=android|ios] [--release]
/deploy-desktop <app> [--platform=win|mac|linux]
/deploy-backend <service> [--restart]
```

### Proactive Automation

Agents automatically trigger on relevant events:

- **Pre-commit**: Quality gate runs before commits (blocks if failing)
- **Post-edit**: Documentation syncs after code changes
- **Context-aware**: Agents activate based on your prompts

### Manual Invocation

Ask Claude directly:

- "Run quality checks on affected projects"
- "Update dependencies safely"
- "Deploy vibe-tutor to Android"

## Skills (Knowledge Base)

6 reference skills provide agents with domain expertise:

- **monorepo-best-practices** - Nx workspace conventions
- **mobile-build-patterns** - Capacitor/Android/iOS workflows
- **desktop-build-patterns** - Electron/Tauri packaging
- **quality-standards** - TypeScript, testing, linting rules
- **nx-caching-strategies** - Cache optimization techniques
- **git-workflow** - Incremental merge strategy

## Build History Tracking

The plugin includes an MCP server that tracks:

- Build history (success/failure, duration)
- Test results (per project, per run)
- Deployment records (environment, status)
- Dependency updates (version changes, test status)

**Database**: `D:\databases\monorepo-automation.db`

## Configuration

### Disable Proactive Hooks

If you prefer manual-only agent invocation, disable hooks:

1. Edit `hooks/hooks.json`
2. Comment out PreToolUse and PostToolUse hooks
3. Keep only UserPromptSubmit for context detection

### Customize Agent Behavior

Edit agent files in `agents/` directory to adjust:

- Triggering conditions
- Tool permissions
- System prompts

## Development

### Directory Structure

```
monorepo-automation/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── agents/                  # 12 agent definitions
├── commands/                # 12 slash commands
├── skills/                  # 6 knowledge skills
├── hooks/                   # Event automation
├── scripts/                 # Utility scripts
│   ├── quality/
│   ├── maintenance/
│   ├── project-management/
│   └── build-deploy/
└── .mcp.json                # Build history MCP
```

### Adding New Agents

1. Create agent markdown in `agents/`
2. Add corresponding command in `commands/`
3. Create supporting scripts in `scripts/`
4. Update README

## Requirements

- **Claude Code**: >= 1.0.0
- **Nx**: >= 21.6.0
- **pnpm**: >= 9.15.0
- **Node.js**: >= 22.x
- **Git**: For version control operations

## Troubleshooting

### Hooks Not Triggering

1. Verify plugin is enabled in Claude Code settings
2. Check `hooks/hooks.json` syntax
3. Restart Claude Code session

### Agent Not Activating

1. Check agent description matches your prompt
2. Verify agent file is in `agents/` directory
3. Use explicit command (e.g., `/quality-gate`)

### Build History Not Recording

1. Verify `D:\databases\monorepo-automation.db` exists
2. Check MCP server is connected (use `/mcp` command)
3. Review MCP logs in Claude Code

## License

MIT License - Part of VibeTech monorepo

## Support

For issues or questions:

- Check agent SKILL.md files for detailed guidance
- Review scripts in `scripts/` for implementation details
- Consult workspace CLAUDE.md for monorepo conventions

---

**Version**: 1.0.0
**Created**: 2026-01-19
**Status**: Production Ready
