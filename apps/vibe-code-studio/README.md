# Vibe Code Studio

Vibe Code Studio is the Tauri-based desktop editor in this monorepo. The Windows 11 release path is Tauri-only, and fresh local Nx validation is the source of truth for release readiness.

## Current delivery contract

- Desktop runtime: Tauri 2 on Windows 11
- Canonical installer output: `apps/vibe-code-studio/src-tauri/target/release/bundle/`
- Canonical installed executable: `%LOCALAPPDATA%\Programs\vibe-code-studio\Vibe Code Studio.exe`
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

Expected artifacts are written under:

```text
apps/vibe-code-studio/src-tauri/target/release/bundle/nsis/
```

The helper scripts in this project validate the Tauri bundle path rather than legacy `dist-electron` output:

- `scripts/build-and-package.ps1`
- `scripts/verify-production-build.ps1`
- `verify-app-working.ps1`

## Release checklist

Use a fresh local run before calling the app merge-ready:

```bash
pnpm nx run vibe-code-studio:typecheck
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:build
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:verify-app-working
```

Then install the newest Windows bundle, launch the app, and smoke-test the editor, task approval flow, and OpenRouter-backed AI flow on the actual desktop build.
