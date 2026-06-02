---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/anthropic-api-tools
  path: tools/anthropic-api
category: tools
---

# @vibetech/anthropic-api-tools AI Notes

## What this project is

- CLI utilities for direct Anthropic API usage - batch review, PR summaries, doc generation

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/anthropic-api-tools`
- **test**: `pnpm nx test @vibetech/anthropic-api-tools`
- **lint**: `pnpm nx lint @vibetech/anthropic-api-tools`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/tools/anthropic-api`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
