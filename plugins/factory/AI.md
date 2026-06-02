---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/factory
  path: plugins/factory
category: packages
---

# @vibetech/factory AI Notes

## What this project is

- Nx app factory generators for VibeTech monetized apps

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run @vibetech/factory:lint`
- **test**: `pnpm nx run @vibetech/factory:test`
- **typecheck**: `pnpm nx run @vibetech/factory:typecheck`
- **build**: `pnpm nx run @vibetech/factory:build`
- **quality**: `pnpm nx run @vibetech/factory:quality`

## Tech Stack & Architecture

- **Core Technologies**: 
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/plugins/factory`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
