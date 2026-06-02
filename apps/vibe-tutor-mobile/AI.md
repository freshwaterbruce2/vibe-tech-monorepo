---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-tutor-mobile
  path: apps/vibe-tutor-mobile
category: apps
---

# vibe-tutor-mobile AI Notes

## What this project is

- vibe-tutor-mobile - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vibe-tutor-mobile:dev`
- **build**: `pnpm nx run vibe-tutor-mobile:build`
- **test**: `pnpm nx run vibe-tutor-mobile:test`
- **typecheck**: `pnpm nx run vibe-tutor-mobile:typecheck`
- **android:sync**: `pnpm nx run vibe-tutor-mobile:android:sync`
- **android:build**: `pnpm nx run vibe-tutor-mobile:android:build`
- **android:bundle:release**: `pnpm nx run vibe-tutor-mobile:android:bundle:release`
- **android:doctor**: `pnpm nx run vibe-tutor-mobile:android:doctor`
- **quality**: `pnpm nx run vibe-tutor-mobile:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-tutor-mobile`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
