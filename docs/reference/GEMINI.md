# GEMINI.md

Guidance for Google Gemini Code Assist when working in this monorepo on Windows 11 (solo dev, 2026).

## Context & Boundaries

- Source of truth lives in `C:\dev`; **alldata/logs/db/learning live on `D:\`** (`D:\logs`, `D:\databases`, `D:\data`, `D:\learning-system`). Do not write large artifacts to `C:`.
- Respect Nx/pnpm workspace layout (`apps/`, `backend/`, `packages/`); prefer Nx tasks over ad-hoc commands.
- Path validation: only create/modify files inside the repo unless explicitly asked; default logs to `D:\logs`.

## Gemini 3 Protocol (Critical for 2026)

To prevent 400 errors and ensure compatibility with Gemini 3 (Pro/Flash) models' strict "Thought Signature" requirements:

- **Sequential Turns**: Strictly alternate: `user` → `model` (function call) → `user` (function response). Never skip a turn or combine multiple response types.
- **Thought Signature**: The CLI must pass back the `thought_signature` exactly as received to route reasoning tokens.
  - _Fallback_: Use `skip_thought_signature_validator` as a last resort if using custom implementations.
- **Settings**: Ensure "Preview features" is toggled ON in CLI settings (`/settings`).

## Preferred Commands

- Install: `pnpm install`
- Lint/format: `pnpm lint-staged` (runs ESLint/Prettier/tsc per config)
- Tests: `pnpm test:unit --runInBand --watch=false --silent` (Vitest)
- Typecheck/lint across projects: `pnpm nx run-many -t typecheck,lint`
- Max line enforcement: `node scripts/check-line-limits.mjs --staged --max 600`

## Build Commands (CRITICAL)

> **NEVER run `pnpm build` from `C:\dev` (workspace root).** Each app has its own build script.

- **Always `cd` into the specific app directory first** before running `pnpm build`
- The workspace root `C:\dev` has `"build": "vite build"` which is NOT correct for Tauri/Electron apps
- Example for Tauri apps: `cd C:\dev\apps\nova-agent && pnpm build`
- Example for Electron apps: `cd C:\dev\apps\vibe-code-studio && pnpm build`
- Use `nx run <project>:build` if you want to build from workspace root

## Mobile Debugging (Vibe Tutor)

- **Protocol**: Always use USB debugging with ADB reverse for reliable backend connection.
- **Command**: `adb reverse tcp:3001 tcp:3001` (Mapping PC localhost:3001 to Android localhost:3001)
- **Backend**: Must run `render-backend/server.mjs` locally.

## Coding Conventions

- Target **500 lines +/- 100 per source file**; split components/helpers early.
- Keep functions small and single-purpose; prefer shared utilities in `packages/` or `libs`.
- Follow existing lint/format configs; do not introduce new formatters.
- No secrets in git; use `.env.example` patterns and environment variables.

## Task Flow

1. Read `CLAUDE.md`, `AGENTS.md`, `STANDARDS.md` for constraints.
2. Plan before multi-file edits; surface a short checklist to the user.
3. Run lint/format/tests + `check-line-limits` before commit.
4. Keep logs and generated artifacts on `D:\` only.

## Prompt Engineering Workspace

- **Location**: `D:\PromptEngineer`
- **Purpose**: Central control center for managing, testing, and optimizing system prompts used by the Unified Learning System.
- **Integration**: Connected to the Unified Database (`D:\databases\nova_shared.db`) via `D:\learning-system\database_config.py`.
- **Tooling**: Use `prompt_manager.py` (CLI) in `D:\PromptEngineer` to list, create, and update prompts.
- **Workflow**:
  1. **Develop**: Write/refine prompts in `D:\PromptEngineer`.
  2. **Publish**: `python prompt_manager.py create` (or `update`) to push to the unified database.
  3. **Consume**: Agents pull active prompts from the `prompt_entities` table in the DB.

## Safety

- Avoid destructive git commands; do not remove user edits.
- When unsure, ask for confirmation before large refactors; prefer incremental changes.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
