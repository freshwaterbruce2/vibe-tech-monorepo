---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/vcs-theme
  path: packages/vcs-theme
category: packages
---

# @vibetech/vcs-theme AI Notes

## What this project is

- Vibe Code Studio design tokens — colors, typography, spacing, shadows, components

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/vcs-theme`
- **test**: `pnpm nx test @vibetech/vcs-theme`
- **lint**: `pnpm nx lint @vibetech/vcs-theme`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/vcs-theme`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
