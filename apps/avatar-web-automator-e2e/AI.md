---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: avatar-web-automator-e2e
  path: apps/avatar-web-automator-e2e
category: apps
---

# avatar-web-automator-e2e AI Notes

## What this project is

- avatar-web-automator-e2e - Application

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build avatar-web-automator-e2e`
- **test**: `pnpm nx test avatar-web-automator-e2e`
- **lint**: `pnpm nx lint avatar-web-automator-e2e`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Node.js
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/avatar-web-automator-e2e`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
