---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: production-ready
lastReviewed: 2026-02-09
---

# GEMINI.md - Vibe Code Studio

## Project Type
AI-powered desktop code editor/IDE built with Electron + React.

## Location
`C:\dev\apps\vibe-code-studio\`

## Tech Stack
- **Framework**: Electron 40 + electron-vite 5
- **Frontend**: React 19 + TypeScript
- **Editor**: Monaco Editor (`@monaco-editor/react`) + Monacopilot
- **Terminal**: xterm.js (`@xterm/xterm`) + `node-pty`
- **AI**: Anthropic SDK, MCP SDK
- **State**: Zustand + Immer
- **IPC**: `@vibetech/shared-ipc` (workspace)
- **Database**: better-sqlite3

## Key Commands
```bash
pnpm dev                  # Start dev (electron-vite)
pnpm build                # Build (electron-vite build)
pnpm electron:build:win   # Package for Windows (NSIS)
pnpm typecheck             # TypeScript check (relaxed)
pnpm test                  # Vitest
pnpm lint                  # ESLint (runs from monorepo root)
```

## Architecture
```
src/
├── main/          # Electron main process
├── preload/       # Preload scripts (IPC bridge)
├── renderer/      # React UI
│   ├── components/  # Editor, terminal, file tree, AI chat
│   ├── stores/      # Zustand state management
│   └── services/    # AI, IPC, file system services
├── shared/        # Types shared between main/renderer
scripts/           # Build helpers, native module prep
hooks/             # Dev automation (memory, perf, docs)
```

## Critical Patterns
- **Native modules**: `better-sqlite3` and `node-pty` require `electron-rebuild` (`pnpm rebuild-deps`)
- **ASAR**: Native `.node` binaries are in `asarUnpack`
- **Build entry**: Uses explicit relative paths (`./electron/main.ts`) to avoid Rollup resolution failures
- **Feature flags**: Integrates `@dev/feature-flags-sdk-node`
- **IPC**: Uses `@vibetech/shared-ipc` for type-safe messaging with backend services

## Quality Checklist
- [ ] `electron-vite build` succeeds
- [ ] Native modules rebuild cleanly
- [ ] TypeScript compiles (relaxed config)
- [ ] Vitest passes
- [ ] CSP allows required AI/CDN sources

## Canonical References
- AI notes: AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
