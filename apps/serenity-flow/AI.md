---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: serenity-flow
  path: apps/serenity-flow
category: apps
---

# serenity-flow AI Notes

## What this project is

- serenity-flow - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run serenity-flow:dev`
- **build**: `pnpm nx run serenity-flow:build`
- **preview**: `pnpm nx run serenity-flow:preview`
- **typecheck**: `pnpm nx run serenity-flow:typecheck`
- **lint**: `pnpm nx run serenity-flow:lint`
- **test**: `pnpm nx run serenity-flow:test`
- **quality**: `pnpm nx run serenity-flow:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Express
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/serenity-flow`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
