# Database App Wrapper (@vibetech/db-app) CLI/Agent Rules

This file guides Universal AI Coding Agents when working in `packages/db-app`.

## 1. Project Commands
- **Build**: `pnpm nx build @vibetech/db-app`
- **Typecheck**: `pnpm nx typecheck @vibetech/db-app`
- **Lint**: `pnpm nx lint @vibetech/db-app`

## 2. Local Domain Rules & Constraints
- **SQLite Database Adapter**: Implements a high-concurrency SQLite client wrapper around `better-sqlite3`.
- **WAL & Concurrency Rules**:
  - Always enforce WAL mode (`PRAGMA journal_mode=WAL;`).
  - Set busy timeout to at least 5000ms (`PRAGMA busy_timeout=5000;`).
  - Enforce parameterized queries to prevent injection and syntax corruption.
- **Physical Boundary Isolation**: All database operations must write to the Data Drive (`D:\databases\`). Never create or access SQLite databases under the code repository (`V:\monorepo`).
- **Migrations**: Database schema updates require explicit SQL migrations. Never run raw schema mutations in production/runtime paths without versioned migration scripts.

## 3. Global Architecture Reference
- Follow global rules in [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md).
- File sizes must strictly adhere to the 500-line soft limit (1000-line hard limit) and 50-line function limits.
