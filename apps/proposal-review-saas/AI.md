---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: proposal-review-saas
  path: apps/proposal-review-saas
category: apps
---

# proposal-review-saas AI Notes

## What this project is

- proposal-review-saas - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run proposal-review-saas:dev`
- **build**: `pnpm nx run proposal-review-saas:build`
- **preview**: `pnpm nx run proposal-review-saas:preview`
- **api:dev**: `pnpm nx run proposal-review-saas:api:dev`
- **api:build**: `pnpm nx run proposal-review-saas:api:build`
- **api:start**: `pnpm nx run proposal-review-saas:api:start`
- **ship:check**: `pnpm nx run proposal-review-saas:ship:check`
- **test**: `pnpm nx run proposal-review-saas:test`
- **typecheck**: `pnpm nx run proposal-review-saas:typecheck`
- **lint**: `pnpm nx run proposal-review-saas:lint`
- **quality**: `pnpm nx run proposal-review-saas:quality`
- **deploy**: `pnpm nx run proposal-review-saas:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/proposal-review-saas`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
