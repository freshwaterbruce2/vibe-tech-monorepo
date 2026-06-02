---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/ui
  path: packages/ui
category: packages
---

# @vibetech/ui AI Notes

## What this project is

- @vibetech/ui - Shared Library

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run @vibetech/ui:lint`
- **build**: `pnpm nx run @vibetech/ui:build`
- **typecheck**: `pnpm nx run @vibetech/ui:typecheck`
- **quality**: `pnpm nx run @vibetech/ui:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/ui`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
