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

### vibe-code-studio (Electron Desktop)
```
Tech: Electron, React, TypeScript, IPC
Commands: pnpm dev | pnpm build | pnpm package
Skills: typescript-expert, react-patterns, performance-profiling
Key: Type-safe IPC, context isolation, preload security
```

### nova-mobile-app (React Native)
```
Tech: React Native, Expo, TypeScript
Commands: pnpm start | pnpm ios | pnpm android
Skills: react-patterns, testing-patterns, mobile-design
Key: FlatList for lists, React Query for data, navigation types
```

### invoice-automation-saas (Next.js SaaS)
```
Tech: Next.js 14, Prisma, Stripe, PostgreSQL
Commands: pnpm dev | pnpm db:push | pnpm build
Skills: nextjs-best-practices, prisma-expert, stripe-integration
Key: ALWAYS filter by tenantId, verify Stripe webhooks
```

### vibe-justice (AI Web App)
```
Tech: Next.js 14, Claude API, SQLite
Commands: pnpm dev | pnpm test | pnpm build
Skills: nextjs-best-practices, llm-app-patterns, react-patterns
Key: Stream AI responses, handle API errors gracefully
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
