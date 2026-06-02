---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-reminder
  path: apps/vibe-reminder
category: apps
---

# vibe-reminder AI Notes

## What this project is

- vibe-reminder - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-reminder:dev`
- **build**: `pnpm nx run vibe-reminder:build`
- **preview**: `pnpm nx run vibe-reminder:preview`
- **api:dev**: `pnpm nx run vibe-reminder:api:dev`
- **api:build**: `pnpm nx run vibe-reminder:api:build`
- **api:start**: `pnpm nx run vibe-reminder:api:start`
- **ship:check**: `pnpm nx run vibe-reminder:ship:check`
- **test**: `pnpm nx run vibe-reminder:test`
- **typecheck**: `pnpm nx run vibe-reminder:typecheck`
- **lint**: `pnpm nx run vibe-reminder:lint`
- **quality**: `pnpm nx run vibe-reminder:quality`
- **deploy**: `pnpm nx run vibe-reminder:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-reminder`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
