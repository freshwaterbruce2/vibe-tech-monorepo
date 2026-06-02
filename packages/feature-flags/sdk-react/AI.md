---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags-sdk-react
  path: packages/feature-flags/sdk-react
category: packages
---

# @vibetech/feature-flags-sdk-react AI Notes

## What this project is

- React SDK for feature flags with hooks and components

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/feature-flags-sdk-react:build`
- **lint**: `pnpm nx run @vibetech/feature-flags-sdk-react:lint`
- **typecheck**: `pnpm nx run @vibetech/feature-flags-sdk-react:typecheck`
- **test**: `pnpm nx run @vibetech/feature-flags-sdk-react:test`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags/sdk-react`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
