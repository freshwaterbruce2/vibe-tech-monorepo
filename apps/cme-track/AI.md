---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: cme-track
  path: apps/cme-track
category: apps
---

# cme-track AI Notes

## What this project is

- cme-track - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run cme-track:dev`
- **build**: `pnpm nx run cme-track:build`
- **preview**: `pnpm nx run cme-track:preview`
- **api:dev**: `pnpm nx run cme-track:api:dev`
- **api:build**: `pnpm nx run cme-track:api:build`
- **api:start**: `pnpm nx run cme-track:api:start`
- **ship:check**: `pnpm nx run cme-track:ship:check`
- **test**: `pnpm nx run cme-track:test`
- **typecheck**: `pnpm nx run cme-track:typecheck`
- **lint**: `pnpm nx run cme-track:lint`
- **quality**: `pnpm nx run cme-track:quality`
- **deploy**: `pnpm nx run cme-track:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/cme-track`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
