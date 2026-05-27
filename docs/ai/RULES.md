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

## What NOT To Do

- Don't mix npm/pnpm commands
- Don't write data to C:\dev (use D:\)
- Don't create files >600 lines
- Don't skip backups before refactors
- Don't use `&&` for command chaining (use `;` in PowerShell)
