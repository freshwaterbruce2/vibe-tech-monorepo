---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-blox
  path: apps/vibe-blox
category: apps
---

# vibe-blox AI Notes

## What this project is

- Token-based incentive system for developmental growth

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-blox:dev`
- **build**: `pnpm nx run vibe-blox:build`
- **preview**: `pnpm nx run vibe-blox:preview`
- **lint**: `pnpm nx run vibe-blox:lint`
- **typecheck**: `pnpm nx run vibe-blox:typecheck`
- **test**: `pnpm nx run vibe-blox:test`
- **server**: `pnpm nx run vibe-blox:server`
- **db:migrate**: `pnpm nx run vibe-blox:db:migrate`
- **db:seed**: `pnpm nx run vibe-blox:db:seed`
- **quality**: `pnpm nx run vibe-blox:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Hono, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-blox`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
