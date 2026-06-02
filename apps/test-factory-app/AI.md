---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: test-factory-app
  path: apps/test-factory-app
category: apps
---

# test-factory-app AI Notes

## What this project is

- test-factory-app - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run test-factory-app:dev`
- **build**: `pnpm nx run test-factory-app:build`
- **preview**: `pnpm nx run test-factory-app:preview`
- **api:dev**: `pnpm nx run test-factory-app:api:dev`
- **api:build**: `pnpm nx run test-factory-app:api:build`
- **api:start**: `pnpm nx run test-factory-app:api:start`
- **ship:check**: `pnpm nx run test-factory-app:ship:check`
- **test**: `pnpm nx run test-factory-app:test`
- **typecheck**: `pnpm nx run test-factory-app:typecheck`
- **lint**: `pnpm nx run test-factory-app:lint`
- **quality**: `pnpm nx run test-factory-app:quality`
- **deploy**: `pnpm nx run test-factory-app:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/test-factory-app`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
