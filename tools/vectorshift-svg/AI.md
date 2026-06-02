---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vectorshift-svg
  path: tools/vectorshift-svg
category: tools
---

# vectorshift-svg AI Notes

## What this project is

- vectorshift-svg - Developer Tool

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run vectorshift-svg:dev`
- **api**: `pnpm nx run vectorshift-svg:api`
- **build**: `pnpm nx run vectorshift-svg:build`
- **start**: `pnpm nx run vectorshift-svg:start`
- **preview**: `pnpm nx run vectorshift-svg:preview`
- **typecheck**: `pnpm nx run vectorshift-svg:typecheck`
- **lint**: `pnpm nx run vectorshift-svg:lint`
- **test**: `pnpm nx run vectorshift-svg:test`
- **clean**: `pnpm nx run vectorshift-svg:clean`
- **quality**: `pnpm nx run vectorshift-svg:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Express
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/tools/vectorshift-svg`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
