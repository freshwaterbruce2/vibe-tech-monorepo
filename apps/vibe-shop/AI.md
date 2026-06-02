---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-shop
  path: apps/vibe-shop
category: apps
---

# vibe-shop AI Notes

## What this project is

- vibe-shop - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-shop:dev`
- **build**: `pnpm nx run vibe-shop:build`
- **start**: `pnpm nx run vibe-shop:start`
- **lint**: `pnpm nx run vibe-shop:lint`
- **db:migrate**: `pnpm nx run vibe-shop:db:migrate`
- **db:generate**: `pnpm nx run vibe-shop:db:generate`
- **db:studio**: `pnpm nx run vibe-shop:db:studio`
- **typecheck**: `pnpm nx run vibe-shop:typecheck`
- **test**: `pnpm nx run vibe-shop:test`
- **test:coverage**: `pnpm nx run vibe-shop:test:coverage`
- **quality**: `pnpm nx run vibe-shop:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript, Tailwind CSS, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-shop`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
