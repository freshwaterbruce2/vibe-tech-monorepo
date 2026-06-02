---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-invoice
  path: apps/vibe-invoice
category: apps
---

# vibe-invoice AI Notes

## What this project is

- vibe-invoice - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-invoice:dev`
- **api:dev**: `pnpm nx run vibe-invoice:api:dev`
- **api:build**: `pnpm nx run vibe-invoice:api:build`
- **api:start**: `pnpm nx run vibe-invoice:api:start`
- **build**: `pnpm nx run vibe-invoice:build`
- **preview**: `pnpm nx run vibe-invoice:preview`
- **lint**: `pnpm nx run vibe-invoice:lint`
- **typecheck**: `pnpm nx run vibe-invoice:typecheck`
- **test**: `pnpm nx run vibe-invoice:test`
- **test:coverage**: `pnpm nx run vibe-invoice:test:coverage`
- **quality**: `pnpm nx run vibe-invoice:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-invoice`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
