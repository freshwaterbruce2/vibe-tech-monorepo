---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/analytics
  path: packages/analytics
category: packages
---

# @vibetech/analytics AI Notes

## What this project is

- Browser analytics wrapper for VibeTech apps with desktop opt-out defaults

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/analytics:build`
- **test**: `pnpm nx run @vibetech/analytics:test`
- **lint**: `pnpm nx run @vibetech/analytics:lint`
- **typecheck**: `pnpm nx run @vibetech/analytics:typecheck`
- **quality**: `pnpm nx run @vibetech/analytics:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/analytics`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
