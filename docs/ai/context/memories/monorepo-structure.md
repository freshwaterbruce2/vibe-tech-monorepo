# VibeTech Monorepo Structure

Last Updated: 2026-05-04

## Overview

C:\dev is an Nx-managed pnpm monorepo. Current `pnpm exec nx show projects --json`
reports 70 projects, but not every directory is a pnpm package.

## Project Breakdown

### Applications (`apps/`)

- `vibetech-command-center`: Electron 33 + electron-vite + electron-builder dashboard; not Tauri.
- `vibe-tutor`: Electron 35.7 + Capacitor 8 tutor app; not React Native or Expo.
- `nova-mobile-app`: Expo 54 + React Native 0.81; this is the actual mobile RN app.
- `vibe-shop`: Next.js 16.1.6 storefront; approved exception to the no-Next default.
- `vibe-justice`: no root `package.json`; Tauri 2 frontend under `frontend/` plus Python backend and PyInstaller `.spec`.
- `business-booking-platform-next`: React/Vite Nx app with no root/frontend package manifest; backend has the only `package.json`.
- `crypto-enhanced`: Python trading/analysis app managed through root scripts and Nx targets.
- `gravity-claw`: local-only nested WIP repo excluded from `pnpm-workspace.yaml`; package version is not a shipped workspace release.

### Backend Services (`backend/`)

Backend services include OpenRouter proxy, IPC/DAP/LSP proxies, workflow engine,
prompt-engineer backend, middleware/config packages, and Nova SQLite MCP.

### Shared Packages (`packages/`)

Shared packages include `@vibetech/ui`, `@vibetech/shared`, `@vibetech/memory`,
`@vibetech/openclaw-bridge`, MCP utilities, feature flags, logging, config, and
Nova packages. `packages/nova-core` currently has no manifest and should not be
treated as a workspace package until one exists.

## Key Files

- nx.json - Nx workspace configuration
- pnpm-workspace.yaml - pnpm workspace definition
- AGENTS.md - Primary Codex/Nx/local workflow instructions
- AI.md - canonical path, tooling, and agent behavior rules
- WORKSPACE.json - stack, project registry, and focus areas
- docs/WORKSPACE_STRUCTURE.md - source vs local-only storage policy

## Performance Benefits

- Nx caching: 80-90% faster builds
- Affected-only builds: Only build what changed
- Parallel execution: Tasks run concurrently
- Shared dependencies: Single node_modules via pnpm

## Navigation Tips

1. Use `pnpm exec nx show projects --json` for the current project list.
2. Use `pnpm exec nx show project <name> --json` for resolved targets.
3. Check package manifests before assuming a directory is a pnpm package.
4. Keep `pnpm-workspace.yaml` exclusions in mind for local-only WIP directories.
