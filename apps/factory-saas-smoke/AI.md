---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: factory-saas-smoke
  path: apps/factory-saas-smoke
category: apps
---

# factory-saas-smoke AI Notes

## What this project is

- factory-saas-smoke - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run factory-saas-smoke:dev`
- **build**: `pnpm nx run factory-saas-smoke:build`
- **preview**: `pnpm nx run factory-saas-smoke:preview`
- **api:dev**: `pnpm nx run factory-saas-smoke:api:dev`
- **api:build**: `pnpm nx run factory-saas-smoke:api:build`
- **api:start**: `pnpm nx run factory-saas-smoke:api:start`
- **ship:check**: `pnpm nx run factory-saas-smoke:ship:check`
- **test**: `pnpm nx run factory-saas-smoke:test`
- **typecheck**: `pnpm nx run factory-saas-smoke:typecheck`
- **lint**: `pnpm nx run factory-saas-smoke:lint`
- **quality**: `pnpm nx run factory-saas-smoke:quality`
- **deploy**: `pnpm nx run factory-saas-smoke:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/factory-saas-smoke`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
