---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-justice-frontend
  path: apps/vibe-justice/frontend
category: apps
---

# vibe-justice-frontend AI Notes

## What this project is

- vibe-justice-frontend - Application

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build vibe-justice-frontend`
- **test**: `pnpm nx test vibe-justice-frontend`
- **lint**: `pnpm nx lint vibe-justice-frontend`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Tauri, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-justice/frontend`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
