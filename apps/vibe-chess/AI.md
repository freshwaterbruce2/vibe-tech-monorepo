---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-chess
  path: apps/vibe-chess
category: apps
---

# vibe-chess AI Notes

## What this project is

- vibe-chess - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-chess:dev`
- **build**: `pnpm nx run vibe-chess:build`
- **preview**: `pnpm nx run vibe-chess:preview`
- **lint**: `pnpm nx run vibe-chess:lint`
- **typecheck**: `pnpm nx run vibe-chess:typecheck`
- **test**: `pnpm nx run vibe-chess:test`
- **validate-lessons**: `pnpm nx run vibe-chess:validate-lessons`
- **validate-chess-ai**: `pnpm nx run vibe-chess:validate-chess-ai`
- **android:sync**: `pnpm nx run vibe-chess:android:sync`
- **android:build**: `pnpm nx run vibe-chess:android:build`
- **android:build:clean**: `pnpm nx run vibe-chess:android:build:clean`
- **android:bundle:release**: `pnpm nx run vibe-chess:android:bundle:release`
- **android:full-build**: `pnpm nx run vibe-chess:android:full-build`
- **android:full-release**: `pnpm nx run vibe-chess:android:full-release`
- **android:doctor**: `pnpm nx run vibe-chess:android:doctor`
- **android:install**: `pnpm nx run vibe-chess:android:install`
- **android:launch**: `pnpm nx run vibe-chess:android:launch`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Express
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-chess`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
