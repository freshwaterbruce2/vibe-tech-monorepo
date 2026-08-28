> Superseded by SHIP_PLAN.md (2026-07-01 cycle).

# Vibe Code Studio Review, Package, Install Plan

## Objective

Review Vibe Code Studio beyond the previous baseline, package a fresh Windows desktop build, install it on the desktop, and verify the installed app is usable.

## Context

- Target repo: `V:\monorepo`
- Target app: `V:\monorepo\apps\vibe-code-studio`
- Remote host: `myfirstbuild`
- Git on the desktop has a known broken global config path warning; use `GIT_CONFIG_GLOBAL=NUL`, `GIT_CONFIG_NOSYSTEM=1`, and `XDG_CONFIG_HOME=V:\monorepo\.gitconfig-empty` when needed.
- Avoid recursive traversal through `node_modules` because workspace junctions can hit Windows untrusted mount-point errors.
- Nx Cloud is unavailable/disabled for this workspace; use `NX_NO_CLOUD=true` and rely on local validation.

## Checklist

- [x] Inspect existing project state, package scripts, Tauri config, and installer outputs.
- [x] Run deeper validation checks before packaging.
- [x] Review packaging/install configuration for obvious blockers or risky settings.
- [x] Fix packaging blocker discovered during review.
- [x] Build/package a fresh Windows app artifact.
- [x] Install the packaged app on the desktop.
- [x] Verify the installed app launches or passes available app verification.
- [x] Record final artifact paths, install result, and any remaining risks.

## Decisions

- 2026-05-24: Use this file as durable task state for the review/package/install workflow.
- 2026-05-24: Keep the Tauri build-script `rerun-if-changed` declarations in `src-tauri/build.rs`; Cargo otherwise tries to fingerprint the whole app package and hits the workspace's Windows untrusted mount-point/git-exclude issue.
- 2026-05-24: Package with isolated Git/XDG env vars plus `D:\Data\Tools\.cargo\bin` on `PATH`; this avoids the remote Git config/exclude issue while preserving `run-tauri.cjs` MSVC setup.

## Verification

- Passed: `pnpm nx run vibe-code-studio:typecheck`
- Passed: `NX_NO_CLOUD=true pnpm nx run vibe-code-studio:lint`
- Passed: `NX_NO_CLOUD=true pnpm nx run vibe-code-studio:test` with 45 test files passed, 757 tests passed, 22 skipped.
- Passed: `NX_NO_CLOUD=true pnpm nx run vibe-code-studio:build`
- Passed: `NX_NO_CLOUD=true pnpm nx run vibe-code-studio:package` with Cargo/Git env isolation.
- Passed: `powershell -NoProfile -ExecutionPolicy Bypass -File verify-app-working.ps1`

## Artifacts

- MSI: `D:\cargo-targets\release\bundle\msi\Vibe Code Studio_1.2.0_x64_en-US.msi`
- NSIS: `D:\cargo-targets\release\bundle\nsis\Vibe Code Studio_1.2.0_x64-setup.exe`
- Installed executable: `C:\Users\fresh_zxae3v6\AppData\Local\Vibe Code Studio\vibe-code-studio.exe`
- MSI install log: `C:\tmp\vcs-install.log`
- Temp MSI copy used to avoid path quoting issues: `C:\tmp\vcs.msi`

## Review Notes

- Packaging initially failed because Cargo could not read repository excludes while fingerprinting `src-tauri`; `src-tauri/build.rs` now emits explicit `rerun-if-changed` entries.
- Rustup was registered but missing from its old PATH location; reinstall put working Rust/Cargo under `D:\Data\Tools\.cargo\bin`.
- Nx Cloud is down/disabled; local Nx commands are the validation source of truth.
- Markdown preview still renders worker-produced HTML through `dangerouslySetInnerHTML`; the worker does not fully sanitize arbitrary markdown before HTML generation. This did not block local install but remains a security hardening item.
- Tauri capabilities intentionally expose local developer-tool power: shell/PTY and broad file scopes including `V:\monorepo` and selected `D:\` paths. This matches the desktop IDE use case but should not be treated as sandboxed untrusted-content execution.
- Test output includes non-failing warnings: styled-components forwards `severity` to DOM in `CodeQualityPanel`, and one React test emits an `act(...)` warning.
- Build output includes a non-failing Vite chunking warning for mixed static/dynamic imports of `@tauri-apps/plugin-fs`.
- Monaco worker payloads are large, especially the TypeScript worker; acceptable for now but worth future performance review.

## Status

Complete. Vibe Code Studio was reviewed, packaged, installed, and launch-verified on `myfirstbuild`.
