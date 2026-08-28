---
type: ai-notes
scope: project
status: detailed
lastReviewed: 2026-04-19
---

# vibe-code-studio

Tauri 2-based AI code editor (React 19 + TypeScript) using `@tauri-apps/cli` and `vite`.

- Workspace rules: ../../docs/ai/WORKSPACE.md
- Monorepo entrypoint: ../../AI.md

## Key commands (recommended)

Prefer Nx targets from the repo root:

```bash
pnpm nx run vibe-code-studio:dev        # Tauri dev (requires Rust toolchain)
pnpm nx run vibe-code-studio:dev:web    # Web-only preview on port 3001
pnpm nx run vibe-code-studio:build      # Vite frontend build
pnpm nx run vibe-code-studio:package    # Full Tauri build + installer
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:typecheck
```

Or run scripts directly inside `apps/vibe-code-studio/`:

```bash
pnpm dev:web
pnpm build
pnpm test
pnpm typecheck
```

## Windows/Tauri notes

- Requires Visual Studio Build Tools 2022 + Rust MSVC toolchain for native build.
- Frontend: Vite on port 5174; Tauri config: `src-tauri/tauri.conf.json`.
- Use `verify-app-working.ps1` to confirm the packaged app is functional.


## Dev system hooks

This project includes `.claude/*` orchestration and a set of hooks (see `hook:*` scripts in `package.json`) used for validation and workflow automation.
