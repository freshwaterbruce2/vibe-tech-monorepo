---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: agent-engine
  path: apps/agent-engine
category: apps
---

# agent-engine AI Notes

## What this project is

- Local-first autonomous coding engine with gated self-improvement for the VibeTech Nx monorepo

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run agent-engine:dev`
- **build**: `pnpm nx run agent-engine:build`
- **lint**: `pnpm nx run agent-engine:lint`
- **typecheck**: `pnpm nx run agent-engine:typecheck`
- **test**: `pnpm nx run agent-engine:test`
- **test:coverage**: `pnpm nx run agent-engine:test:coverage`
- **benchmark**: `pnpm nx run agent-engine:benchmark`
- **self-eval**: `pnpm nx run agent-engine:self-eval`
- **promote-candidate**: `pnpm nx run agent-engine:promote-candidate`
- **quality**: `pnpm nx run agent-engine:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/agent-engine`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
