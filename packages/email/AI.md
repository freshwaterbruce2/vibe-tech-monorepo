---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: email
  path: packages/email
category: packages
---

# email AI Notes

## What this project is

- email - Shared Library

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run email:build`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/email`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
