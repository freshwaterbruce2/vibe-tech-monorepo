---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/entitlements
  path: packages/entitlements
category: packages
---

# @vibetech/entitlements AI Notes

## What this project is

- Plan-to-feature entitlement mapping for VibeTech apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/entitlements:build`
- **test**: `pnpm nx run @vibetech/entitlements:test`
- **lint**: `pnpm nx run @vibetech/entitlements:lint`
- **typecheck**: `pnpm nx run @vibetech/entitlements:typecheck`
- **quality**: `pnpm nx run @vibetech/entitlements:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/entitlements`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
