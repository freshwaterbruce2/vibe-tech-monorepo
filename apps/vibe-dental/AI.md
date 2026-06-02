---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-dental
  path: apps/vibe-dental
category: apps
---

# vibe-dental AI Notes

## What this project is

- vibe-dental - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-dental:dev`
- **build**: `pnpm nx run vibe-dental:build`
- **preview**: `pnpm nx run vibe-dental:preview`
- **api:dev**: `pnpm nx run vibe-dental:api:dev`
- **api:build**: `pnpm nx run vibe-dental:api:build`
- **api:start**: `pnpm nx run vibe-dental:api:start`
- **ship:check**: `pnpm nx run vibe-dental:ship:check`
- **test**: `pnpm nx run vibe-dental:test`
- **typecheck**: `pnpm nx run vibe-dental:typecheck`
- **lint**: `pnpm nx run vibe-dental:lint`
- **quality**: `pnpm nx run vibe-dental:quality`
- **deploy**: `pnpm nx run vibe-dental:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-dental`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
