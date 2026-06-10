# Component Registry

Master inventory of all AI ecosystem components tracked by ecosystem-sync.
Last updated: 2026-02-25

## Skills

| Skill          | Location                                     | Key Dependencies     | Last Verified |
| -------------- | -------------------------------------------- | -------------------- | ------------- |
| ecosystem-sync | `V:\monorepo\.claude\skills\user\ecosystem-sync\` | All components below | 2026-02-25    |

> **Note**: `monorepo-maintenance` and `vibetech-agents` are Claude.ai skills (in
> user preferences / memory), not local skill directories. They don't have paths to scan.

## Agents

### Config Files

| File             | Path                                                 | Contains                      |
| ---------------- | ---------------------------------------------------- | ----------------------------- |
| Agent registry   | `V:\monorepo\.claude\agents.json`                         | Agent definitions, categories |
| Agent delegation | `V:\monorepo\.claude\agent-delegation.yaml`               | Execution order, parallelism  |
| Agent config     | `V:\monorepo\.claude\sub-agents\config.yml`               | Sub-agent configurations      |
| Agent rules      | `V:\monorepo\.claude\AGENT_RULES.md`                      | Behavioral constraints        |
| Architecture     | `V:\monorepo\.claude\COMPREHENSIVE_AGENT_ARCHITECTURE.md` | Full system design            |

### Driftable Fields Per Agent

- `model`: Must be valid (haiku-4.5, sonnet-4.5, opus-4.6)
- `description`: Required (previously found missing in 15 agents)
- `triggers`: File patterns must match actual monorepo structure

## MCP Servers (under V:\monorepo\apps\)

| Server               | Location                            | Type               |
| -------------------- | ----------------------------------- | ------------------ |
| desktop-commander-v3 | `V:\monorepo\apps\desktop-commander-v3\` | Desktop automation |
| mcp-gateway          | `V:\monorepo\apps\mcp-gateway\`          | Gateway/router     |
| mcp-codeberg         | `V:\monorepo\apps\mcp-codeberg\`         | GitHub integration |
| mcp-skills-server    | `V:\monorepo\apps\mcp-skills-server\`    | Skills serving     |
| memory-mcp           | `V:\monorepo\apps\memory-mcp\`           | Memory/context     |

### MCP Config Locations

| Config                | Path                                          | Format |
| --------------------- | --------------------------------------------- | ------ |
| Claude Desktop        | `%APPDATA%\Claude\claude_desktop_config.json` | JSON   |
| Claude Code (project) | `V:\monorepo\.mcp.json`                            | JSON   |

### Driftable Fields Per MCP Server

- `package.json` → `@modelcontextprotocol/sdk` version
- `package.json` → `zod` peer dependency
- Source files → legacy `setRequestHandler` vs new `registerTool` API
- Config entries → executable path validity

## Apps (26 total in V:\monorepo\apps\)

### With CLAUDE.md (9)

| App                       | Path                                              |
| ------------------------- | ------------------------------------------------- |
| business-booking-platform | `V:\monorepo\apps\business-booking-platform\CLAUDE.md` |
| crypto-enhanced           | `V:\monorepo\apps\crypto-enhanced\CLAUDE.md`           |
| desktop-commander-v3      | `V:\monorepo\apps\desktop-commander-v3\CLAUDE.md`      |
| nova-agent                | `V:\monorepo\apps\nova-agent\CLAUDE.md`                |
| shipping-pwa              | `V:\monorepo\apps\shipping-pwa\CLAUDE.md`              |
| vibe-code-studio          | `V:\monorepo\apps\vibe-code-studio\CLAUDE.md`          |
| vibe-justice              | `V:\monorepo\apps\vibe-justice\CLAUDE.md`              |
| vibe-tech-lovable         | `V:\monorepo\apps\vibe-tech-lovable\CLAUDE.md`         |
| vibe-tutor                | `V:\monorepo\apps\vibe-tutor\CLAUDE.md`                |

### Without CLAUDE.md (17)

agent-sdk-workspace, ai-youtube-pipeline, avge-dashboard, clawdbot-desktop,
gravity-claw, invoice-automation-saas, mcp-codeberg, mcp-gateway,
mcp-skills-server, memory-mcp, nova-mobile-app,
prompt-engineer, symptom-tracker, vibe-shop, VibeBlox, vtde

## Packages (27 in V:\monorepo\packages\)

backend, db-app, db-learning, feature-flags, logger, mcp-core, mcp-testing,
memory, nova-core (directory only; no package manifest), nova-database, nova-types, openclaw-bridge, openrouter-client,
service-common, shared-config, shared-ipc, shared-logic, shared-utils,
testing-utils, ui, vibe-python-shared, vibetech-hooks, vibetech-shared,
vibetech-types

## Cross-Cutting Configs

| Config              | Path                         |
| ------------------- | ---------------------------- |
| tsconfig.base.json  | `V:\monorepo\tsconfig.base.json`  |
| nx.json             | `V:\monorepo\nx.json`             |
| pnpm-workspace.yaml | `V:\monorepo\pnpm-workspace.yaml` |
| eslint.config.js    | `V:\monorepo\eslint.config.js`    |
| package.json        | `V:\monorepo\package.json`        |
| .mcp.json           | `V:\monorepo\.mcp.json`           |

---

**Maintenance**: Update this registry whenever:

- A new app, MCP server, or package is added/removed
- A component is renamed or relocated
- An app gains or loses its CLAUDE.md
