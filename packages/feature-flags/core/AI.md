---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags-core
  path: packages/feature-flags/core
category: packages
---

# @vibetech/feature-flags-core AI Notes

## What this project is

- Core types and utilities for feature flags system

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/feature-flags-core:build`
- **lint**: `pnpm nx run @vibetech/feature-flags-core:lint`
- **typecheck**: `pnpm nx run @vibetech/feature-flags-core:typecheck`
- **test**: `pnpm nx run @vibetech/feature-flags-core:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags/core`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
