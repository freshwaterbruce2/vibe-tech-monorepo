# nx-toolkit

Advanced Nx monorepo toolkit plugin for Claude Code. Provides dependency management, impact analysis, upgrade orchestration, governance enforcement, and workspace advisory capabilities.

## Features

### Skills (Auto-Activated)

| Skill | Triggers On |
|-------|-------------|
| **Nx Deep Dive** | Nx performance tuning, custom executors, generators, migration, cache optimization |
| **Monorepo Governance** | Dependency policies, project boundaries, module boundaries, import restrictions |

### Commands (User-Initiated)

| Command | Description |
|---------|-------------|
| `/nx-toolkit:dep-sync [--fix]` | Find and fix dependency version mismatches across workspace |
| `/nx-toolkit:impact <project>` | Deep cascade impact analysis with blast radius |
| `/nx-toolkit:upgrade <package>` | Orchestrated dependency upgrade with breaking change detection |

### Agents (Autonomous)

| Agent | Description |
|-------|-------------|
| **workspace-advisor** | Analyzes workspace structure, finds dead code, suggests consolidation |

### Hooks (Automatic)

| Hook | Event | Description |
|------|-------|-------------|
| **boundary-check** | PreToolUse (Write/Edit) | Warns on cross-project import violations |

## Installation

```bash
# Install as local plugin
claude --plugin-dir C:\dev\plugins\nx-toolkit
```

Or add to your Claude Code settings to load automatically.

## Prerequisites

- Nx workspace (nx.json configured)
- pnpm package manager
- Node.js 20+

## Usage Examples

### Check for dependency mismatches

```
/nx-toolkit:dep-sync
```

Auto-fix mismatches:

```
/nx-toolkit:dep-sync --fix
```

### Analyze impact before changing a shared library

```
/nx-toolkit:impact shared-utils
/nx-toolkit:impact @nova/core --depth 5
```

### Plan a major dependency upgrade

```
/nx-toolkit:upgrade react --to 19.2.0
/nx-toolkit:upgrade typescript --dry-run
/nx-toolkit:upgrade @nx/js
```

### Get workspace improvement suggestions

Ask: "Analyze my workspace and suggest improvements"

The workspace-advisor agent will run automatically and produce a structured report.

## Complementary to Existing Tools

This plugin extends (does not duplicate) the existing Nx tooling:

- **Existing `/nx:affected`** - Basic affected detection
  **New `/nx-toolkit:impact`** - Deep cascade analysis with blast radius scoring

- **Existing `/nx:workspace-health`** - Basic health check
  **New workspace-advisor agent** - Comprehensive structural analysis with consolidation recommendations

- **No existing equivalent** for `/nx-toolkit:dep-sync` and `/nx-toolkit:upgrade`

## Architecture

```
nx-toolkit/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── nx-deep-dive/          # Advanced Nx patterns
│   │   ├── SKILL.md
│   │   └── references/
│   └── monorepo-governance/   # Architectural constraints
│       ├── SKILL.md
│       └── references/
├── commands/
│   ├── dep-sync.md            # Dependency version sync
│   ├── impact.md              # Cascade impact analysis
│   └── upgrade.md             # Upgrade orchestrator
├── agents/
│   └── workspace-advisor.md   # Structural improvement advisor
└── hooks/
    └── hooks.json             # Boundary violation detection
```
