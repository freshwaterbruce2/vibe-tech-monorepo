---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/service-common
  path: packages/service-common
category: packages
---

# @vibetech/service-common AI Notes

## What this project is

- Shared utilities, middleware, and types for microservices

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/service-common:build`
- **lint**: `pnpm nx run @vibetech/service-common:lint`
- **typecheck**: `pnpm nx run @vibetech/service-common:typecheck`
- **quality**: `pnpm nx run @vibetech/service-common:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Express, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/service-common`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
