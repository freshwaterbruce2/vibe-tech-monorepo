---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/core
  path: packages/core
category: packages
---

# @vibetech/core AI Notes

## What this project is

- Consolidated core services and utilities for the Vibetech monorepo

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/core:build`
- **lint**: `pnpm nx run @vibetech/core:lint`
- **typecheck**: `pnpm nx run @vibetech/core:typecheck`
- **test**: `pnpm nx run @vibetech/core:test`
- **quality**: `pnpm nx run @vibetech/core:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/core`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
