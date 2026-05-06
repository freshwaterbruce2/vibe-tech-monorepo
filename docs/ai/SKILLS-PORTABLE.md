# Portable Skills Reference

> **Cross-Tool AI Instructions** - Copy relevant sections to your AI tool's context

This document consolidates project skills for use across different AI tools.

---

## How to Use

| Tool | Where to Add |
|------|--------------|
| Claude Code | Automatic (uses `.claude/commands/`) |
| Claude Desktop | Project instructions or system prompt |
| VSCode Copilot | `.github/copilot-instructions.md` |
| GeminiCli | `GEMINI.md` in project root |
| Cursor | `.cursorrules` file |
| Other | AI config/instructions field |

---

## Project Skills Quick Reference

### nova-agent (Tauri + React)
```
Tech: Tauri 2.x, React 18, TypeScript, Vite
Commands: pnpm dev | pnpm build | pnpm test | pnpm typecheck
Skills: typescript-expert, react-patterns, systematic-debugging
Key: Tauri invoke() for Rust ↔ TS, Services are singletons
```

### crypto-enhanced (Python Trading)
```
Tech: Python 3.11+, asyncio, ccxt, pandas
Commands: pytest tests/ | mypy src/ | ruff check src/
Skills: python-patterns, systematic-debugging, test-driven-development
Key: ALWAYS wrap exchange calls in try/except, log all trades
```

### vibe-code-studio (Tauri Desktop)
```
Tech: Tauri 2, React, TypeScript, IPC
Commands: pnpm dev | pnpm build | pnpm tauri:build
Skills: typescript-expert, react-patterns, performance-profiling
Key: Type-safe IPC, Tauri invoke paths, desktop file-system permissions
```

### nova-mobile-app (React Native)
```
Tech: Expo 54, React Native 0.81, TypeScript
Commands: pnpm start | pnpm ios | pnpm android
Skills: react-patterns, testing-patterns, mobile-design
Key: FlatList for lists, React Query for data, navigation types
```

### vibe-tutor (Electron + Capacitor)
```
Tech: Electron 35.7, Capacitor 8, React 19, Vite, Express
Commands: pnpm nx build vibe-tutor | pnpm nx android:sync vibe-tutor | pnpm nx android:build vibe-tutor
Skills: react-patterns, testing-patterns, mobile-design
Key: This is not React Native or Expo; Android goes through Capacitor.
```

### vibetech-command-center (Electron Dashboard)
```
Tech: Electron 33, electron-vite, electron-builder, React, better-sqlite3
Commands: pnpm nx build vibetech-command-center | pnpm nx test vibetech-command-center
Skills: typescript-expert, react-patterns, systematic-debugging
Key: This is not Tauri; use Electron/electron-vite packaging paths.
```

### invoice-automation-saas (Next.js SaaS)
```
Tech: Next.js 14, Prisma, Stripe, PostgreSQL
Commands: pnpm dev | pnpm db:push | pnpm build
Skills: nextjs-best-practices, prisma-expert, stripe-integration
Key: ALWAYS filter by tenantId, verify Stripe webhooks
```

### vibe-justice (Tauri + Python)
```
Tech: Tauri 2 frontend, React/Vite, Python/FastAPI backend, PyInstaller .spec
Commands: pnpm nx build vibe-justice | pnpm nx test:frontend vibe-justice | pnpm nx test:backend vibe-justice
Skills: react-patterns, llm-app-patterns, python-patterns
Key: No root package.json; commands delegate into frontend and backend directories.
```

---

## Universal Workflow Skills

### For ANY Bug
1. Use `systematic-debugging` skill
2. Find root cause BEFORE fixing
3. Write failing test that reproduces bug
4. Fix and verify

### For ANY Feature
1. Use `test-driven-development` skill
2. Write failing test first
3. Implement minimal code to pass
4. Refactor

### Before ANY Commit
1. Use `verification-before-completion` skill
2. Run tests: evidence before claims
3. Run typecheck/lint
4. Verify build passes

---

## Copy-Paste Context Blocks

### For TypeScript Projects
```
Always use strict TypeScript. Prefer interfaces for object shapes.
Use branded types for domain primitives. Enable noUncheckedIndexedAccess.
Run typecheck before claiming work complete.
```

### For React Projects
```
Use functional components with hooks. Prefer composition over inheritance.
State: useState for local, Context for subtree, Zustand for global.
Memoize expensive calculations. Use React Query for server state.
```

### For Python Projects
```
Use type hints everywhere. Async/await for I/O operations.
Always handle exceptions explicitly. Use dataclasses or Pydantic.
Run pytest and mypy before committing.
```
