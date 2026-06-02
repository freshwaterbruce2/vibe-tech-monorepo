---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: ai
  path: packages/ai
category: packages
---

# ai AI Notes

## What this project is

- ai - Shared Library

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run ai:build`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, pnpm workspace package
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/ai`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
