---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-booking-backend
  path: apps/vibe-booking-backend
category: apps
---

# vibe-booking-backend AI Notes

## What this project is

- vibe-booking-backend - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-booking-backend:dev`
- **build**: `pnpm nx run vibe-booking-backend:build`
- **preview**: `pnpm nx run vibe-booking-backend:preview`
- **api:dev**: `pnpm nx run vibe-booking-backend:api:dev`
- **api:build**: `pnpm nx run vibe-booking-backend:api:build`
- **api:start**: `pnpm nx run vibe-booking-backend:api:start`
- **ship:check**: `pnpm nx run vibe-booking-backend:ship:check`
- **test**: `pnpm nx run vibe-booking-backend:test`
- **typecheck**: `pnpm nx run vibe-booking-backend:typecheck`
- **lint**: `pnpm nx run vibe-booking-backend:lint`
- **quality**: `pnpm nx run vibe-booking-backend:quality`
- **deploy**: `pnpm nx run vibe-booking-backend:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-booking-backend`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
