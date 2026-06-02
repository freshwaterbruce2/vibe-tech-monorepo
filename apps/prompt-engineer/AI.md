---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: prompt-engineer-app
  path: apps/prompt-engineer
category: apps
---

# prompt-engineer-app AI Notes

## What this project is

- prompt-engineer-app - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run prompt-engineer-app:dev`
- **build**: `pnpm nx run prompt-engineer-app:build`
- **lint**: `pnpm nx run prompt-engineer-app:lint`
- **typecheck**: `pnpm nx run prompt-engineer-app:typecheck`
- **quality**: `pnpm nx run prompt-engineer-app:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Express, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/prompt-engineer`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
