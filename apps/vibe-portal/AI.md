---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-portal
  path: apps/vibe-portal
category: apps
---

# vibe-portal AI Notes

## What this project is

- vibe-portal - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-portal:dev`
- **build**: `pnpm nx run vibe-portal:build`
- **preview**: `pnpm nx run vibe-portal:preview`
- **api:dev**: `pnpm nx run vibe-portal:api:dev`
- **api:build**: `pnpm nx run vibe-portal:api:build`
- **api:start**: `pnpm nx run vibe-portal:api:start`
- **ship:check**: `pnpm nx run vibe-portal:ship:check`
- **test**: `pnpm nx run vibe-portal:test`
- **typecheck**: `pnpm nx run vibe-portal:typecheck`
- **lint**: `pnpm nx run vibe-portal:lint`
- **quality**: `pnpm nx run vibe-portal:quality`
- **deploy**: `pnpm nx run vibe-portal:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-portal`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
