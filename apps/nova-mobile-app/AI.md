---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: nova-mobile-app
  path: apps/nova-mobile-app
category: apps
---

# nova-mobile-app AI Notes

## What this project is

- nova-mobile-app - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run nova-mobile-app:dev`
- **typecheck**: `pnpm nx run nova-mobile-app:typecheck`
- **test**: `pnpm nx run nova-mobile-app:test`
- **test:coverage**: `pnpm nx run nova-mobile-app:test:coverage`
- **lint**: `pnpm nx run nova-mobile-app:lint`
- **build**: `pnpm nx run nova-mobile-app:build`
- **quality**: `pnpm nx run nova-mobile-app:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/nova-mobile-app`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
