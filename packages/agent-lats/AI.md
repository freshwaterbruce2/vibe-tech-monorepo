---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: agent-lats
  path: packages/agent-lats
category: packages
---

# agent-lats AI Notes

## What this project is

- Language Agent Tree Search — MCTS-powered planning for autonomous agents

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run agent-lats:build`
- **lint**: `pnpm nx run agent-lats:lint`
- **test**: `pnpm nx run agent-lats:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/agent-lats`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
