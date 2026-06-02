---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/db-app
  path: packages/db-app
category: packages
---

# @vibetech/db-app AI Notes

## What this project is

- App database adapter with migrations and WAL

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/db-app:build`
- **lint**: `pnpm nx run @vibetech/db-app:lint`
- **typecheck**: `pnpm nx run @vibetech/db-app:typecheck`
- **quality**: `pnpm nx run @vibetech/db-app:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/db-app`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
