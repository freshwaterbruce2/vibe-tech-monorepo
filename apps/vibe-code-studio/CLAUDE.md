# Vibe Code Studio (vibe-code-studio) CLI/Agent Rules

This file guides Universal AI Coding Agents when working in `apps/vibe-code-studio`.

## 1. Project Commands
- **Dev (Tauri)**: `pnpm nx dev vibe-code-studio`
- **Dev (Web only)**: `pnpm nx dev:web vibe-code-studio`
- **Build (Web/Frontend)**: `pnpm nx build vibe-code-studio`
- **Package (Tauri Bundle)**: `pnpm nx package vibe-code-studio`
- **Typecheck**: `pnpm nx typecheck vibe-code-studio`
- **Lint**: `pnpm nx lint vibe-code-studio`
- **Test**: `pnpm nx test vibe-code-studio`

## 2. Local Domain Rules & Constraints
- **Tauri & Electron Desktop Editor**: Built using React 19, Tauri 2.0 (Rust), and Monaco Editor.
- **Monaco & Editor Layout**: Ensure Monaco instances are disposed of properly on component unmount to prevent memory leaks. Do not override default keybindings without checking existing shortcuts.
- **Tauri Bridge**: All desktop communications must go through Tauri `invoke` or the verified IPC bridge (`@vibetech/shared-ipc`).
- **File System**: Local workspace editing actions must be validated for safety and respect the standard user security boundaries.
- **Path Compliance**: Absolute paths must be resolved via the active config modules. Do not hardcode workspace boundaries.

## 3. Global Architecture Reference
- Follow global rules in [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md).
- File sizes must strictly adhere to the 500-line soft limit (1000-line hard limit) and 50-line function limits.
