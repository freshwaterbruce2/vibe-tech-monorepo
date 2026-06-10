---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-04
project:
  name: vibe-hermes-control
  path: apps/vibe-hermes-control
category: apps
---

# vibe-hermes-control AI Notes

## What this project is

- vibe-hermes-control - A React + Vite workspace application that serves as a mission control dashboard for Hermes Agent memory, docs, cron jobs, and task pipelines.

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run vibe-hermes-control:lint`
- **typecheck**: `pnpm nx run vibe-hermes-control:typecheck`
- **build**: `pnpm nx run vibe-hermes-control:build`
- **serve**: `pnpm nx run vibe-hermes-control:dev`
- **preview**: `pnpm nx run vibe-hermes-control:preview`
- **test**: `pnpm nx run vibe-hermes-control:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, React, Vite
- **Ports**: 
  - Dev: `4388`
  - Preview: `4389`
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `V:/monorepo/apps/vibe-hermes-control`.

## References

- Workspace Rules: [RULES.md](file:///V:/monorepo/docs/ai/RULES.md)
