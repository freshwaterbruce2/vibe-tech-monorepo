---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/landing
  path: packages/landing
category: packages
---

# @vibetech/landing AI Notes

## What this project is

- Shared landing page sections for VibeTech monetized apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/landing:build`
- **test**: `pnpm nx run @vibetech/landing:test`
- **lint**: `pnpm nx run @vibetech/landing:lint`
- **typecheck**: `pnpm nx run @vibetech/landing:typecheck`
- **quality**: `pnpm nx run @vibetech/landing:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/landing`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
