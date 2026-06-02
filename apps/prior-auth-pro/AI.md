---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: prior-auth-pro
  path: apps/prior-auth-pro
category: apps
---

# prior-auth-pro AI Notes

## What this project is

- prior-auth-pro - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run prior-auth-pro:dev`
- **build**: `pnpm nx run prior-auth-pro:build`
- **preview**: `pnpm nx run prior-auth-pro:preview`
- **api:dev**: `pnpm nx run prior-auth-pro:api:dev`
- **api:build**: `pnpm nx run prior-auth-pro:api:build`
- **api:start**: `pnpm nx run prior-auth-pro:api:start`
- **ship:check**: `pnpm nx run prior-auth-pro:ship:check`
- **test**: `pnpm nx run prior-auth-pro:test`
- **typecheck**: `pnpm nx run prior-auth-pro:typecheck`
- **lint**: `pnpm nx run prior-auth-pro:lint`
- **quality**: `pnpm nx run prior-auth-pro:quality`
- **deploy**: `pnpm nx run prior-auth-pro:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/prior-auth-pro`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
