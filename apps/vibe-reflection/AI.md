---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-reflection
  path: apps/vibe-reflection
category: apps
---

# vibe-reflection AI Notes

## What this project is

- vibe-reflection - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-reflection:dev`
- **dev:client**: `pnpm nx run vibe-reflection:dev:client`
- **dev:server**: `pnpm nx run vibe-reflection:dev:server`
- **build**: `pnpm nx run vibe-reflection:build`
- **typecheck**: `pnpm nx run vibe-reflection:typecheck`
- **lint**: `pnpm nx run vibe-reflection:lint`
- **test**: `pnpm nx run vibe-reflection:test`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Express, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-reflection`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
