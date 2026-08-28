---
name: code-studio:build
description: Build Vibe Code Studio (Tauri 2) for Windows production
model: sonnet
---

# Vibe Code Studio Production Build

Build the Vibe Code Studio desktop editor (Tauri 2 + React 19 + Vite) for Windows.

> This is a **Tauri** app, not Electron. The frontend is built with Vite (`tsc && vite build`)
> and packaged into MSI/NSIS installers by the Tauri CLI. Run all commands from the repo
> root `V:\monorepo` — the Nx targets set the correct `cwd`.

## Steps

1. (Optional) Clean previous artifacts:

   ```powershell
   pnpm nx run vibe-code-studio:clean
   ```

2. Build the frontend (TypeScript + Vite bundle → `apps/vibe-code-studio/dist`):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:build
   ```

3. Package the Windows desktop app (Tauri → MSI + NSIS installers):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:package
   ```

   Packaging compiles the Rust backend and needs the MSVC toolchain plus the isolated
   Cargo/Git environment documented in `apps/vibe-code-studio/PLAN.md` (Rust/Cargo under
   `D:\Data\Tools\.cargo\bin`, `GIT_CONFIG_GLOBAL=NUL`).

4. (Optional) Smoke-verify the built app:

   ```powershell
   pnpm nx run vibe-code-studio:verify-app-working
   ```

## Expected Output

- `apps/vibe-code-studio/dist/` — optimized Vite frontend bundle.
- MSI installer: `…/release/bundle/msi/Vibe Code Studio_<version>_x64_en-US.msi`
- NSIS installer: `…/release/bundle/nsis/Vibe Code Studio_<version>_x64-setup.exe`
  (the workspace redirects the Cargo target dir to `D:\cargo-targets`, so installers land
  under `D:\cargo-targets\release\bundle\…`).
- Per-user installer (`currentUser` NSIS mode). No Electron runtime is bundled.
