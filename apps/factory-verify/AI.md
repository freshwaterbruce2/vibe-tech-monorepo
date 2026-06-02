---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: factory-verify
  path: apps/factory-verify
category: apps
---

# factory-verify AI Notes

## What this project is

- factory-verify - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run factory-verify:dev`
- **build**: `pnpm nx run factory-verify:build`
- **preview**: `pnpm nx run factory-verify:preview`
- **api:dev**: `pnpm nx run factory-verify:api:dev`
- **api:build**: `pnpm nx run factory-verify:api:build`
- **api:start**: `pnpm nx run factory-verify:api:start`
- **ship:check**: `pnpm nx run factory-verify:ship:check`
- **test**: `pnpm nx run factory-verify:test`
- **typecheck**: `pnpm nx run factory-verify:typecheck`
- **lint**: `pnpm nx run factory-verify:lint`
- **quality**: `pnpm nx run factory-verify:quality`
- **deploy**: `pnpm nx run factory-verify:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/factory-verify`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
