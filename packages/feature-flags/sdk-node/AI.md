---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags-sdk-node
  path: packages/feature-flags/sdk-node
category: packages
---

# @vibetech/feature-flags-sdk-node AI Notes

## What this project is

- Node.js SDK for feature flags (NOVA Agent, DeepCode Editor, backend services)

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/feature-flags-sdk-node:build`
- **lint**: `pnpm nx run @vibetech/feature-flags-sdk-node:lint`
- **typecheck**: `pnpm nx run @vibetech/feature-flags-sdk-node:typecheck`
- **test**: `pnpm nx run @vibetech/feature-flags-sdk-node:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags/sdk-node`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
