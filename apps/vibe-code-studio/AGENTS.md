# Vibe Code Studio - Agent Guidelines

This file provides guidance for AI agents working in `apps/vibe-code-studio`.

## Local + GitHub Workflow Rule

- Treat the local working tree as the canonical source of truth.
- Prefer local execution, local validation, and local artifacts over hosted workflows.
- Prefer GitHub when remote hosting guidance is needed.

## Bruce's Configuration Rules

Bruce uses OpenRouter for day-to-day AI setup in this app. Do not document direct DeepSeek, Anthropic, or OpenAI keys as the primary workflow.

### OpenRouter-Only Setup

- Primary key: `VITE_OPENROUTER_API_KEY`
- Optional proxy: `VITE_OPENROUTER_PROXY_URL=http://localhost:3001`
- Default model alias: `deepseek-chat` through OpenRouter
- OpenAI, Anthropic, Groq, Perplexity, Together, and Ollama are routed through OpenRouter in Bruce's local setup

Current setup references:

- `README.md`
- `scripts/openrouter-proxy.js`
- `scripts/verify-openrouter.ts`

## Architecture Overview

Vibe Code Studio is a Tauri desktop application with a React frontend.

### Core Stack

- Frontend: React 19 + TypeScript + styled-components
- Editor: Monaco Editor
- Desktop runtime: Tauri 2
- Build tooling: Vite + Tauri CLI
- AI: OpenRouter-backed provider layer
- Database: SQLite on `D:\`

### Core Services

- `src/services/ai/UnifiedAIService.ts` - main AI orchestration
- `src/services/ai/AIProviderFactory.ts` - provider initialization and routing
- `src/modules/core/hooks/useAppServices.ts` - service instantiation
- `src/services/DatabaseService.ts` - database operations

## Preferred Commands

Run from the monorepo root:

```bash
pnpm install --frozen-lockfile
pnpm nx run vibe-code-studio:dev
pnpm nx run vibe-code-studio:typecheck
pnpm nx run vibe-code-studio:lint
pnpm nx run vibe-code-studio:test
pnpm nx run vibe-code-studio:build
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:verify-app-working
```

## Windows Release Rules

- The Windows release path is Tauri-only.
- Canonical installer artifacts live under `src-tauri/target/release/bundle/`.
- Canonical installed executable path is `%LOCALAPPDATA%\Programs\vibe-code-studio\Vibe Code Studio.exe`.
- Use fresh local Nx runs plus an installer smoke test as release evidence.
- Do not rely on archived logs or historical delivery notes as proof that the current build is good.

## Common Issues

### Provider not initialized

Cause:
OpenRouter key or proxy configuration is missing.

Fix:
- Verify `VITE_OPENROUTER_API_KEY`
- If using a local proxy, verify `VITE_OPENROUTER_PROXY_URL`
- Restart the app after updating credentials

### Windows package build fails

Cause:
Rust, WebView2, or Windows build prerequisites are missing.

Fix:
- Re-check the Windows prerequisites in `README.md`
- Rerun `pnpm nx run vibe-code-studio:package`

### `setTaskContext is not a function`

Cause:
`ExecutionEngine` was not instantiated correctly.

Fix:
- Check `src/modules/core/hooks/useAppServices.ts`
- Use a real `new ExecutionEngine(...)`, never `{ } as any`

## Important Notes

1. Keep persistent databases on `D:\`.
2. Keep OpenRouter as the documented AI setup path.
3. Preserve backwards compatibility where practical, but make Tauri the canonical desktop runtime.
4. Use fresh validation before saying the app is ship-ready.
