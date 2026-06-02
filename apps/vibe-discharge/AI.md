---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-discharge
  path: apps/vibe-discharge
category: apps
---

# vibe-discharge AI Notes

## What this project is

- vibe-discharge - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-discharge:dev`
- **build**: `pnpm nx run vibe-discharge:build`
- **preview**: `pnpm nx run vibe-discharge:preview`
- **api:dev**: `pnpm nx run vibe-discharge:api:dev`
- **api:build**: `pnpm nx run vibe-discharge:api:build`
- **api:start**: `pnpm nx run vibe-discharge:api:start`
- **ship:check**: `pnpm nx run vibe-discharge:ship:check`
- **test**: `pnpm nx run vibe-discharge:test`
- **typecheck**: `pnpm nx run vibe-discharge:typecheck`
- **lint**: `pnpm nx run vibe-discharge:lint`
- **quality**: `pnpm nx run vibe-discharge:quality`
- **deploy**: `pnpm nx run vibe-discharge:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-discharge`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
