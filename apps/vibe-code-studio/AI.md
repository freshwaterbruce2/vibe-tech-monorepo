---
type: ai-notes
scope: project
status: detailed
lastReviewed: 2026-01-22
---

# vibe-code-studio

Electron-based AI code editor (React 19 + TypeScript) using `electron-vite` and `electron-builder`.

- Workspace rules: ../../docs/ai/WORKSPACE.md
- Monorepo entrypoint: ../../AI.md
- Legacy reference: CLAUDE.legacy.2026-01-22.md

## Key commands (recommended)

Prefer Nx targets from the repo root:

```bash
pnpm nx run vibe-code-studio:dev
pnpm nx run vibe-code-studio:build
pnpm nx run vibe-code-studio:build --configuration=production
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:test:electron
pnpm nx run vibe-code-studio:typecheck
pnpm nx run vibe-code-studio:rebuild-deps
```

Or run scripts directly inside `apps/vibe-code-studio/`:

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:electron
pnpm typecheck
```

## Windows/native module notes

- `postinstall` runs `electron-builder install-app-deps`.
- If you hit native module issues (e.g. `better-sqlite3`, `node-pty`), run `pnpm nx run vibe-code-studio:rebuild-deps`.
- There are helper scripts like `verify-app-working.ps1`.

## Legacy docs

Legacy docs (CLAUDE.legacy.2026-01-22.md, GEMINI.legacy.2026-01-22.md, WINDOWS_QUICKSTART.md) use npm and older standalone scripts.
Translate npm -> pnpm and prefer Nx targets when following those references.

## Dev system hooks

This project includes `.claude/*` orchestration and a set of hooks (see `hook:*` scripts in `package.json`) used for validation and workflow automation.
