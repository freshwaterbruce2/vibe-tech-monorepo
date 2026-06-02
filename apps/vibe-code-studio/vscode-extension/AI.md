---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: vibe-code-studio-vscode
  path: apps/vibe-code-studio/vscode-extension
category: apps
---

# vibe-code-studio-vscode AI Notes

## What this project is

- Port of Vibe Code Studio AI features for VS Code

## Standard Commands (Nx preferred)

- **typecheck**: `pnpm nx run vibe-code-studio-vscode:typecheck`
- **build**: `pnpm nx run vibe-code-studio-vscode:build`
- **test**: `pnpm nx run vibe-code-studio-vscode:test`
- **lint**: `pnpm nx run vibe-code-studio-vscode:lint`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/vibe-code-studio/vscode-extension`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
