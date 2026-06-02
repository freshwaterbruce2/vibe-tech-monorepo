---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/avatars
  path: packages/avatars
category: packages
---

# @vibetech/avatars AI Notes

## What this project is

- Shared avatar types, data, and components for VibeTech apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/avatars:build`
- **lint**: `pnpm nx run @vibetech/avatars:lint`
- **typecheck**: `pnpm nx run @vibetech/avatars:typecheck`
- **test**: `pnpm nx run @vibetech/avatars:test`
- **quality**: `pnpm nx run @vibetech/avatars:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/avatars`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
