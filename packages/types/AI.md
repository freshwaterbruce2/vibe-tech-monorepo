---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/types
  path: packages/types
category: packages
---

# @vibetech/types AI Notes

## What this project is

- Shared TypeScript type definitions for VibeTech monorepo projects

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/types:build`
- **lint**: `pnpm nx run @vibetech/types:lint`
- **typecheck**: `pnpm nx run @vibetech/types:typecheck`
- **quality**: `pnpm nx run @vibetech/types:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/types`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
