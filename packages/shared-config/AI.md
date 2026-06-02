---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/shared-config
  path: packages/shared-config
category: packages
---

# @vibetech/shared-config AI Notes

## What this project is

- Shared configuration and environment utilities

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/shared-config:build`
- **test**: `pnpm nx run @vibetech/shared-config:test`
- **test:coverage**: `pnpm nx run @vibetech/shared-config:test:coverage`
- **lint**: `pnpm nx run @vibetech/shared-config:lint`
- **typecheck**: `pnpm nx run @vibetech/shared-config:typecheck`
- **quality**: `pnpm nx run @vibetech/shared-config:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/shared-config`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
