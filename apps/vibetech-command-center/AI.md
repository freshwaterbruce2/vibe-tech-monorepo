---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/command-center
  path: apps/vibetech-command-center
category: apps
---

# @vibetech/command-center AI Notes

## What this project is

- Vibe-Tech Command Center — monorepo dashboard, diagnostics, and Claude Code bridge

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run @vibetech/command-center:dev`
- **serve**: `pnpm nx run @vibetech/command-center:serve`
- **build**: `pnpm nx run @vibetech/command-center:build`
- **test**: `pnpm nx run @vibetech/command-center:test`
- **preview**: `pnpm nx run @vibetech/command-center:preview`
- **lint**: `pnpm nx run @vibetech/command-center:lint`
- **typecheck**: `pnpm nx run @vibetech/command-center:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Electron, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibetech-command-center`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
