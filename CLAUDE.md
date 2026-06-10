# CLAUDE.md — Workspace Entrypoint & Rules

This file outlines the build, test, lint, and workflow rules for Claude Code and other agents working in the VibeTech Monorepo.

---

## 🛠️ Commands

Always prefer running tasks through **Nx** using the workspace's package manager `pnpm`:

- **Build Project**: `pnpm nx build <project>` (e.g., `pnpm nx build vtde`)
- **Run Dev Server**: `pnpm nx dev <project>` (e.g., `pnpm nx dev vtde`)
- **Run Unit Tests**: `pnpm nx test <project>` (or `pnpm --filter <project> test`)
- **Lint/Format Project**: `pnpm nx lint <project>` (or `pnpm --filter <project> lint`)
- **Type Check Project**: `pnpm nx run <project>:typecheck` (or `pnpm --filter <project> typecheck`)
- **Run Workspace Check**: `pnpm run workspace:health`

---

## 🚨 Critical Rules & Guardrails

### 1. Paths & Data Storage (Non-Negotiable)
- **Code Directory**: Located at `V:\monorepo`.
- **Data Directory**: Located at `D:\`. Strictly segregated from code.
- **Approved Data Paths**:
  - SQLite/PostgreSQL Databases: `D:\databases\<project>\`
  - Runtime logs: `D:\logs\<project>\`
  - Datasets & Ingestion folders: `D:\data\`
  - Agent Learning System: `D:\learning-system\`
- **Constraint**: Under no circumstances should databases, runtime logs, or temporary execution caches be written directly to the codebase root. All code files must default to writing/reading data from `D:\`.

### 2. Package Management & PowerShell Chaining
- **Package Manager**: Use `pnpm` exclusively. Never run `npm` or `yarn` at the workspace root or inside scripts (unless resolving strict native dependency issues).
- **Chaining**: When chaining commands in PowerShell 7+, use semicolons (`;`) or native logic commands, **never** `&&`.

### 3. Coding Standards & File Limits
- **Soft Limit**: Strict 500-line soft limit per file. Component and logic modules should target 200–300 lines. Split early.
- **Function Limit**: Keep individual functions under 50 lines.
- **TypeScript**: Strict mode must remain enabled. No explicit `any` without a justification comment.
- **Imports**: Use path aliases (e.g. `@/`) instead of deep relative paths.
- **Comments & Commits**: Explain the **why**, not the **what**. **Do not use emojis** in code comments or git commit messages.

### 4. Safety & Verification (Trading Bot)
- **Live Trading Bot**: The `apps/crypto-enhanced` directory contains a live trading system trading real money. **Never** make changes or run trading actions without explicit user confirmation and mock-only tests.
- **Verification**: All code changes are complete only when verified through linting, typechecking, and testing.
- **User Visual Validation**: For any visual/UI modification, you must instruct/ask the user to manually/visually test the result before concluding.

---

👉 For complete context, detailed workflow patterns, and advanced guidelines, refer to:
- [AI.md](file:///V:/monorepo/AI.md) - Canonical workspace rules
- [AGENTS.md](file:///V:/monorepo/AGENTS.md) - Master agent routing & technology stack
