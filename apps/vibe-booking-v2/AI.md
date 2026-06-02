---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-booking-v2
  path: apps/vibe-booking-v2
category: apps
---

# vibe-booking-v2 AI Notes

## What this project is

- vibe-booking-v2 - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-booking-v2:dev`
- **build**: `pnpm nx run vibe-booking-v2:build`
- **preview**: `pnpm nx run vibe-booking-v2:preview`
- **api:dev**: `pnpm nx run vibe-booking-v2:api:dev`
- **api:build**: `pnpm nx run vibe-booking-v2:api:build`
- **api:start**: `pnpm nx run vibe-booking-v2:api:start`
- **ship:check**: `pnpm nx run vibe-booking-v2:ship:check`
- **test**: `pnpm nx run vibe-booking-v2:test`
- **typecheck**: `pnpm nx run vibe-booking-v2:typecheck`
- **lint**: `pnpm nx run vibe-booking-v2:lint`
- **quality**: `pnpm nx run vibe-booking-v2:quality`
- **deploy**: `pnpm nx run vibe-booking-v2:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-booking-v2`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
