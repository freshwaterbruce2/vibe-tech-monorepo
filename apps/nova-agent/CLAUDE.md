# NOVA Agent (nova-agent) CLI/Agent Rules

This file guides Universal AI Coding Agents when working in `apps/nova-agent`.

## 1. Project Commands
- **Dev (Tauri)**: `pnpm nx dev nova-agent`
- **Build**: `pnpm nx build nova-agent` (Frontend + Rust)
- **Frontend Build**: `pnpm nx build:frontend nova-agent`
- **Rust Build**: `pnpm nx build:rust nova-agent`
- **Typecheck**: `pnpm nx typecheck nova-agent`
- **Lint**: `pnpm nx lint nova-agent`
- **Test (Vitest)**: `pnpm nx test nova-agent`
- **Test (Rust)**: `pnpm nx test:rust nova-agent`
- **Check Rust**: `pnpm nx check:rust nova-agent`

## 2. Local Domain Rules & Constraints
- **Desktop Assistant**: NOVA is a Tauri 2.0 desktop assistant (React + Rust + SQLite).
- **RAG & Memory Integrations**: Coordinates with `@vibetech/memory` and `mcp-rag-server`. Ensure LanceDB and local embeddings use proper caching under `D:\`.
- **Rust Backend**: Enforce clean module mapping under `src-tauri/src`. Rust functions exposed via `#[tauri::command]` must validate inputs strictly and handle errors gracefully using typed Results.
- **Drive Segregation**: Under no circumstances should databases, logs, or cache stores be written to `V:\monorepo`. All storage must default to `D:\databases\nova-agent\` and `D:\logs\nova-agent\`.
- **Electron Security**: Custom ESLint rule `no-localstorage-electron` prevents `localStorage` usage.

## 3. Global Architecture Reference
- Follow global rules in [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md).
- File sizes must strictly adhere to the 500-line soft limit (1000-line hard limit) and 50-line function limits.
