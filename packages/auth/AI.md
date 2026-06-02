---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/auth
  path: packages/auth
category: packages
---

# @vibetech/auth AI Notes

## What this project is

- Shared auth helpers for VibeTech workspace apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/auth:build`
- **test**: `pnpm nx run @vibetech/auth:test`
- **lint**: `pnpm nx run @vibetech/auth:lint`
- **typecheck**: `pnpm nx run @vibetech/auth:typecheck`
- **quality**: `pnpm nx run @vibetech/auth:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/auth`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
