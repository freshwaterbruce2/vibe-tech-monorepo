---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: avatar-web-automator
  path: apps/avatar-web-automator
category: apps
---

# avatar-web-automator AI Notes

## What this project is

- avatar-web-automator - Application

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run avatar-web-automator:build`
- **dev**: `pnpm nx run avatar-web-automator:dev`
- **lint**: `pnpm nx run avatar-web-automator:lint`
- **typecheck**: `pnpm nx run avatar-web-automator:typecheck`
- **test**: `pnpm nx run avatar-web-automator:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Node.js
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/avatar-web-automator`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
