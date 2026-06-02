# Workspace Rules (All Agents)

## Critical Constraints

- **Package Manager**: `pnpm` only. NEVER use `npm` or `yarn`.
- **Version Control & CI**: Hosted on GitHub (https://github.com/freshwaterbruce2/vibe-tech-monorepo). Use GitHub Actions for CI.
- **Permitted Development Tools**: Only use Codex CLI (by ChatGPT), Antigravity 2.0 CLI, and Antigravity 2.0 IDE for editing, refactoring, building, or backing up the monorepo. All other tools (including VS Code, Claude Code, and Cursor) are strictly prohibited.
- **File Structure**: Target 500 lines +/- 100 per file. Split components and logic early.
- **Pathing**: Use **absolute paths** in documentation and when calling tools.
- **Safety**: Backup files before destructive changes. Verify builds locally before committing.

## MCP Servers (Local Tools)

- `mcp-skills-server` — Skill library

## Self-Healing Tools

- `tools/ralph` — Autonomous maintenance system (RAMS)
- `tools/autofixer` — Real-time autofixer agent
- `tools/vibe-finisher` — Project completion tool

## Project Structure & Data

- **Apps**: `C:\dev\apps\`
- **Packages**: `C:\dev\packages\`
- **Tools**: `C:\dev\tools\`
- **Data/Logs/DB**: `D:\` (Strictly enforced. Do not write large artifacts to C:)
- **Learning System**: `D:\learning-system\`
- **Workspace Configuration**: `C:\dev\WORKSPACE.json` (Read this first on session start).

## Environment & Build Protocols

- **Build Commands**: Prefer Nx targets from the workspace root.
  - Correct: `pnpm nx build nova-agent`
  - Correct: `pnpm nx test vibe-tutor`
  - Incorrect: `pnpm build` from the root; the root build script intentionally fails.
  - App-local commands are allowed only when the project docs or `project.json` target requires them.
- **Vite Production Builds**: Enforce `cross-env NODE_ENV=production` for all production builds to prevent compiler emission of `jsxDEV` calls, which crash on startup when React resolves to its production bundle.
- **Tauri / Electron Build Commands**: In configuration files (e.g., `tauri.conf.json`), define the `beforeBuildCommand` as `pnpm run build` or explicitly set `NODE_ENV=production` so the built bundles are correctly optimized.
- **Database Env Overrides**: Database connection logic must check for the `DATABASE_PATH` environment variable first before falling back to `D:\databases\` to align with the paths policy.
- **Command chaining**: Use semicolons (`;`) not `&&` (PowerShell 7+).
- **Mobile Debugging**: Use `adb reverse tcp:3001 tcp:3001` for Android <-> Localhost connection.
- **Windows Compatibility**: Use proper path handling for Windows.

## AI Interaction Protocol

1. **Sequential Turns**: Strictly follow `user` -> `model` -> `user`.
2. **Context Awareness**: Check `WORKSPACE.json` and `CURRENT.md` to understand current state and focus.
3. **Artifacts**: Created in conversation artifacts directory, but reference `D:\` for persistent storage or `C:\dev` for source code.

## Workspace Documentation Standards

Every project component, tool, or resource in this monorepo must adhere to strict documentation structures based on its type. Historical or point-in-time files (e.g., old post-mortems, temporary audit reports, or specific draft release logs) must not reside in project roots and must be moved to a `docs/archive/` or `docs/history/` directory.

### 1. Applications (`apps/`)
Must maintain exactly three root documentation files:
- `README.md` — Technical / User overview, dependencies, quick start, build, and test commands.
- `AI.md` — Context for AI agents working on the project (agent orientation, key state files, paths, and architecture boundaries).
- `RELEASE_READY.md` — Production release checklist, build environment requirements, verification steps, and current release metadata (version, date, features).

### 2. Shared Libraries & Packages (`packages/`)
Must maintain exactly two root documentation files:
- `README.md` — Technical details, package API exports, usage examples, consumer integration, and test setup.
- `AI.md` — Orientation for AI agents (type definitions, architecture constraints, dependency mapping, and internal files).

### 3. MCP Servers
Must maintain exactly three root documentation files:
- `README.md` — Technical setup, installation, environment variables, configuration, and execution instructions.
- `AI.md` — AI orientation, codebase layout, and external API mappings.
- `TOOLS.md` — Reference schemas for all tools, resources, prompts, input arguments, output payloads, and mock responses for local testing.

### 4. Skills (`.agent/skills/`)
Must maintain exactly one root documentation file:
- `SKILL.md` — YAML frontmatter (name, description, tags, version), environment requirements, operational playbook, rules, and example commands/procedures.

### 5. Agents (`.agent/agents/`)
Must maintain exactly one root documentation file:
- `AGENT.md` — Standard system prompt, role definition, behavioral directives, tool bindings, and agent-to-agent communication protocols.

### 6. Plugins (e.g., Vite, Tauri, or Nx Plugins)
Must maintain exactly one root documentation file:
- `PLUGIN.md` — Technical API, lifecycle hooks, configuration options, input/output schemas, and troubleshooting guidelines.

### 7. Tools & Utilities (`tools/`)
Must maintain exactly two root documentation files:
- `README.md` — Script/utility capabilities, execution commands, parameter/option references, and example input/output payloads.
- `AI.md` — Context for AI agents invoking, configuring, or extending the tool's automation logic.

### 8. CI/CD Workflows (`.github/workflows/`)
Must maintain exactly one root documentation file:
- `README.md` — Structural layout of pipelines, trigger events, target filters, cache strategies, build configurations, and triage instructions for failed runs.

**Maintenance**: When any component is modified, the agent MUST update these standardized files to reflect the changes.

## Shared Agent Workflows & Commands

### `/reset-password` Command
- **Purpose**: Securely reset a user's password across database stores.
- **Skill Files**:
  - [.agent/skills/reset-password/SKILL.md](file:///C:/dev/.agent/skills/reset-password/SKILL.md) (Antigravity IDE)
  - [.claude/skills/reset-password/SKILL.md](file:///C:/dev/.claude/skills/reset-password/SKILL.md) (Claude Code)
- **Utility Runner**: [scripts/reset-db-password.js](file:///C:/dev/scripts/reset-db-password.js)

## What NOT To Do

- Don't mix npm/pnpm commands
- Don't write data to C:\dev (use D:\)
- Don't create files >600 lines
- Don't skip backups before refactors
- Don't use `&&` for command chaining (use `;` in PowerShell)
- Don't keep historical or point-in-time files in application root directories (archive them to `docs/archive/` or `docs/history/` instead)

