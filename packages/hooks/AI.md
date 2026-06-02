---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/hooks
  path: packages/hooks
category: packages
---

# @vibetech/hooks AI Notes

## What this project is

- Shared React hooks for VibeTech monorepo projects

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/hooks:build`
- **lint**: `pnpm nx run @vibetech/hooks:lint`
- **typecheck**: `pnpm nx run @vibetech/hooks:typecheck`
- **quality**: `pnpm nx run @vibetech/hooks:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/hooks`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
