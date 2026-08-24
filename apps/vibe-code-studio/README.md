# Vibe Code Studio

Vibe Code Studio is the Tauri-based desktop editor in this monorepo. The Windows 11 release path is Tauri-only, and fresh local Nx validation is the source of truth for release readiness.

## Current delivery contract

- Desktop runtime: Tauri 2 on Windows 11
- Canonical installer output: Cargo `target_directory` + `release/bundle` (default `apps/vibe-code-studio/src-tauri/target/release/bundle`, commonly `D:\cargo-targets\release\bundle` on local machines with global Cargo config)
- Canonical local installation: `V:\Apps\Vibe_Code_Studio\vibe-code-studio.exe`
- AI setup: OpenRouter-only for Bruce's local workflow
- Validation rule: do not treat archived logs or old delivery notes as release evidence

## Requirements

- Node.js and `pnpm`
- Rust toolchain for Tauri builds
- Microsoft C++ build tools
- WebView2 runtime on Windows 11
- An OpenRouter API key

## Environment

Minimum local setup:

```bash
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

Optional local proxy setup:

```bash
VITE_OPENROUTER_PROXY_URL=http://localhost:3001
```

If you want a local proxy instead of direct OpenRouter requests:

```bash
node apps/vibe-code-studio/scripts/openrouter-proxy.js
```

## Development

Run from the monorepo root:

```bash
pnpm install --frozen-lockfile
pnpm nx run vibe-code-studio:dev
```

Useful project targets:

```bash
pnpm nx run vibe-code-studio:typecheck
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:build
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:verify-app-working
```

## Windows packaging

Build the Windows installer from the monorepo root:

```bash
pnpm nx run vibe-code-studio:package
```

Expected artifacts are written under Cargo's resolved target directory:

```text
<cargo-target-dir>/release/bundle/
```

Example on this workspace:

```text
D:\cargo-targets\release\bundle\
```

The helper scripts in this project resolve Cargo's active target directory and validate the Tauri bundle path rather than legacy `dist-electron` output:

- `scripts/build-and-package.ps1`
- `scripts/verify-production-build.ps1`
- `scripts/check-windows-signing-readiness.ps1`
- `scripts/smoke-msi-installer.ps1`

`scripts/verify-production-build.ps1` now validates artifacts, checks optional Windows signing readiness, runs MSI install/uninstall smoke by default, then launches the app and optionally runs typecheck/lint/tests.

### Optional Windows signing enforcement

Unsigned builds are still allowed by default so local packaging is non-breaking.
To make signing readiness a hard requirement, use either:

```bash
pnpm nx run vibe-code-studio:signing-readiness -- --RequireSigning
```

or set:

```bash
VCS_REQUIRE_WINDOWS_SIGNING=true
```

Common signing inputs (kept in local env or CI secrets, never in git):

- `TAURI_WINDOWS_SIGNTOOL_PATH` (optional override for `signtool.exe`)
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` (when using Azure-backed `signCommand`)
- certificate thumbprint / digest / timestamp config in `src-tauri/tauri.conf.json` for local cert-store signing

### MSI smoke behavior

MSI smoke installs and uninstalls the newest matching `.msi` artifact silently.
For safety, it skips automatically when the same MSI product code is already installed on the machine (unless forced with script flags).

## Release checklist

Use a fresh local run before calling the app merge-ready:

```bash
pnpm nx run vibe-code-studio:typecheck
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:build
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:verify-production-build
```

If you need to skip MSI smoke for a one-off local run, pass `--SkipMsiSmoke` to `scripts/verify-production-build.ps1` or set `VCS_SKIP_MSI_SMOKE=true`.
