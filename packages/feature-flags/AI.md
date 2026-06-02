---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags
  path: packages/feature-flags
category: packages
---

# @vibetech/feature-flags AI Notes

## What this project is

- Feature flags system for the monorepo

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/feature-flags:build`
- **lint**: `pnpm nx run @vibetech/feature-flags:lint`
- **typecheck**: `pnpm nx run @vibetech/feature-flags:typecheck`
- **quality**: `pnpm nx run @vibetech/feature-flags:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, pnpm workspace package
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
