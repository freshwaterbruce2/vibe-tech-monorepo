---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: _-factory-runtime-smoke
  path: apps/_-factory-runtime-smoke
category: apps
---

# _-factory-runtime-smoke AI Notes

## What this project is

- _-factory-runtime-smoke - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run _-factory-runtime-smoke:dev`
- **build**: `pnpm nx run _-factory-runtime-smoke:build`
- **preview**: `pnpm nx run _-factory-runtime-smoke:preview`
- **api:dev**: `pnpm nx run _-factory-runtime-smoke:api:dev`
- **api:build**: `pnpm nx run _-factory-runtime-smoke:api:build`
- **api:start**: `pnpm nx run _-factory-runtime-smoke:api:start`
- **ship:check**: `pnpm nx run _-factory-runtime-smoke:ship:check`
- **test**: `pnpm nx run _-factory-runtime-smoke:test`
- **typecheck**: `pnpm nx run _-factory-runtime-smoke:typecheck`
- **lint**: `pnpm nx run _-factory-runtime-smoke:lint`
- **quality**: `pnpm nx run _-factory-runtime-smoke:quality`
- **deploy**: `pnpm nx run _-factory-runtime-smoke:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/_-factory-runtime-smoke`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
