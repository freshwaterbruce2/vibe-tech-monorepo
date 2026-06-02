---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-booking
  path: apps/vibe-booking
category: apps
---

# vibe-booking AI Notes

## What this project is

- vibe-booking - Application

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run vibe-booking:lint`
- **typecheck**: `pnpm nx run vibe-booking:typecheck`
- **build**: `pnpm nx run vibe-booking:build`
- **serve**: `pnpm nx run vibe-booking:serve`
- **preview**: `pnpm nx run vibe-booking:preview`
- **test**: `pnpm nx run vibe-booking:test`
- **serve-static**: `pnpm nx run vibe-booking:serve-static`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Node.js
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-booking`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
