---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: backend-config
  path: backend/config
category: packages
---

# backend-config AI Notes

## What this project is

- backend-config - Shared Library

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run backend-config:lint`
- **typecheck**: `pnpm nx run backend-config:typecheck`
- **test**: `pnpm nx run backend-config:test`
- **dev**: `pnpm nx run backend-config:dev`
- **build**: `pnpm nx run backend-config:build`
- **start**: `pnpm nx run backend-config:start`

## Tech Stack & Architecture

- **Core Technologies**: 
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/backend/config`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
