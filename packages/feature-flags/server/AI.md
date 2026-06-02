---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags-server
  path: packages/feature-flags/server
category: packages
---

# @vibetech/feature-flags-server AI Notes

## What this project is

- Feature flag server with REST API and WebSocket support

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/feature-flags-server`
- **test**: `pnpm nx test @vibetech/feature-flags-server`
- **lint**: `pnpm nx lint @vibetech/feature-flags-server`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Express, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags/server`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
