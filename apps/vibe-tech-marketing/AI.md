---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-tech-marketing
  path: apps/vibe-tech-marketing
category: apps
---

# vibe-tech-marketing AI Notes

## What this project is

- vibe-tech-marketing - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-tech-marketing:dev`
- **build**: `pnpm nx run vibe-tech-marketing:build`
- **preview**: `pnpm nx run vibe-tech-marketing:preview`
- **test**: `pnpm nx run vibe-tech-marketing:test`
- **typecheck**: `pnpm nx run vibe-tech-marketing:typecheck`
- **lint**: `pnpm nx run vibe-tech-marketing:lint`
- **quality**: `pnpm nx run vibe-tech-marketing:quality`
- **deploy**: `pnpm nx run vibe-tech-marketing:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-tech-marketing`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
