---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: backend-middleware
  path: backend/middleware
category: packages
---

# backend-middleware AI Notes

## What this project is

- backend-middleware - Shared Library

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run backend-middleware:lint`
- **build**: `pnpm nx run backend-middleware:build`
- **typecheck**: `pnpm nx run backend-middleware:typecheck`
- **test**: `pnpm nx run backend-middleware:test`

## Tech Stack & Architecture

- **Core Technologies**: 
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/backend/middleware`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
