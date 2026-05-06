# Glossary - VibeTech Workspace

## Acronyms And Terms

| Term                | Meaning                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| Nx                  | Monorepo build, project graph, and affected-task system.                           |
| MCP                 | Model Context Protocol - standard for AI tool/server integrations.                 |
| OpenClaw            | Local gateway/bridge package and workflow surface.                                 |
| WAL                 | Write-Ahead Logging for SQLite databases.                                          |
| CIPE                | Nx Cloud CI pipeline execution.                                                    |
| Fix CI              | Nx Cloud self-healing command: `pnpm exec nx fix-ci`.                              |
| Quarantine          | Explicit list of known skipped/flaky tests in `quarantine.json`.                   |
| Quality affected    | `pnpm run quality:affected`, the root affected lint/typecheck/build gate.          |
| Workspace health    | `pnpm run workspace:health`, the path, learning, database, and sync audit wrapper. |
| Sync audit          | `pnpm run sync:audit:report`, the monorepo project/config drift report.            |
| Active project lock | Local guard in `D:\active-project\active-project.json` that limits commit scope.   |

## Project Names

| Name                | Meaning                                                           |
| ------------------- | ----------------------------------------------------------------- |
| Vibe Tutor          | Electron 35.7 + Capacitor 8 tutor app in `apps/vibe-tutor`; not React Native or Expo. |
| Chessmaster Academy | Chess learning app in `apps/chessmaster-academy`.                 |
| Gravity Claw        | Local-only WIP AI agent orchestrator in `apps/gravity-claw`, excluded from pnpm workspace. |
| Command Center      | Electron 33 dashboard/diagnostics app in `apps/vibetech-command-center`; not Tauri. |
| Vibe Code Studio    | Tauri 2 IDE in `apps/vibe-code-studio`.                            |
| Nova Agent          | Tauri desktop assistant in `apps/nova-agent`.                     |
| Nova Mobile App     | Expo 54 / React Native 0.81 mobile app in `apps/nova-mobile-app`. |
| Vibe Justice        | Tauri 2 frontend + Python backend app in `apps/vibe-justice`; no root package.json. |
| Vibe Shop           | Next.js 16.1.6 storefront in `apps/vibe-shop`; approved Next exception. |
| BBP Next            | Business booking React/Vite app with only a backend package manifest. |
| VibeBlox            | Gamified token economy app in `apps/VibeBlox`.                    |
| Crypto Enhanced     | Python trading/analysis app in `apps/crypto-enhanced`, managed by root scripts/Nx targets. |
| nova-core           | Directory at `packages/nova-core` without a package manifest.     |

## Tooling

| Name                 | Meaning                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| pnpm                 | Required package manager for the monorepo.                                     |
| Renovate             | Version-update bot for npm and GitHub Actions dependencies.                    |
| Dependabot alerts    | GitHub dependency graph/security alert surface; not the version-update PR bot. |
| Dependency review    | GitHub Actions PR dependency diff enforcement.                                 |
| Nx Cloud             | Remote cache, CI run recording, and self-healing CI provider.                  |
| Desktop Commander v3 | Windows automation MCP server.                                                 |
| Port Manager         | Local PowerShell port allocation tooling under `tools/port-manager`.           |
