---
name: code-studio:dev
description: Start Vibe Code Studio (Tauri 2) in development mode
model: sonnet
---

# Vibe Code Studio Development Mode

Start the Vibe Code Studio editor in development with hot reload. Run from `V:\monorepo`.

## Steps

1. Full desktop app (native Tauri shell + Vite HMR):

   ```powershell
   pnpm nx run vibe-code-studio:dev
   ```

   This runs `tauri:dev` (via `scripts/run-tauri.cjs`), which starts Vite on port 5174 and
   launches the native Tauri window against it. The first run compiles the Rust backend and
   may take several minutes.

2. Web-only (no native shell, fastest UI iteration):

   ```powershell
   pnpm nx run vibe-code-studio:dev:web
   ```

   Serves the renderer at http://localhost:3001 in a browser. Tauri-native features (PTY
   terminal, native dialogs, scoped file system) are unavailable in web-only mode.

## Expected Output

- `dev`: native Tauri window opens with the editor; Vite HMR on save; DevTools available.
- `dev:web`: browser app on http://localhost:3001 with HMR.
- Press Ctrl+C to stop.
