---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/backend
  path: packages/backend
category: packages
---

# @vibetech/backend AI Notes

## What this project is

- @vibetech/backend - Shared Library

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/backend:build`
- **test**: `pnpm nx run @vibetech/backend:test`
- **lint**: `pnpm nx run @vibetech/backend:lint`
- **typecheck**: `pnpm nx run @vibetech/backend:typecheck`
- **quality**: `pnpm nx run @vibetech/backend:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/backend`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
