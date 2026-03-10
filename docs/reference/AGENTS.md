# Repository Guidelines

## 🚨 Non-negotiable Rules (2025 Architecture)

**1. Nova Agent**

- **Role**: Always-on context-aware guide.
- **Capabilities**: Logs everything, surfaces "Next Steps"/"Doing Right"/"At Risk", scaffolds/builds projects.
- **Access**: Full file system access with path validation; uses latest DeepSeek (2025-12-02).

**2. Deep Code Editor**

- **Role**: Separate monocle-grade IDE replacing VS Code/Cursor.
- **Capabilities**: Full file/AST/refactor/codegen, uses DeepSeek, owns its UI.

**3. Storage & Persistence**

- **Location**: **D:\ ONLY** (WAL mode). No data on C:\.
- **Files**: `D:\databases\agent_tasks.db`, `agent_learning.db`, `nova_activity.db`.
- **Enforcement**: Fail fast if `DATABASE_PATH` is not on D:\.

**4. Prompt Engineering & System Prompts**

- **Location**: `D:\PromptEngineer` (Workspace), `D:\databases\nova_shared.db` (Storage).
- **Access**: Agents must fetch their system prompts from the `prompt_entities` and `prompt_versions` tables in the unified database, rather than hardcoded strings.
- **Management**: Use the `prompt_manager.py` tool in `D:\PromptEngineer` to manage prompt versions.

**5. Bridge & IPC**

- **Transport**: WebSocket/IPC bridge (default `ws://127.0.0.1:5004`).
- **Schema**: Shared `packages/shared-ipc` schemas (`context:update`, `learning:sync`, `activity:sync`, `project:create`, `guidance:request`, `file:open`, `task:update`).
- **Client Behavior**: Nova client must queue + reconnect; surface connection state in UI.

**5. Safety**

- No secrets in git.
- `.env.example` required.
- DeepSeek API key gating.
- Path validation for all writes.

## Project Structure & Module Organization

- Monorepo managed by pnpm workspaces (`pnpm-workspace.yaml`) and Turborepo (`turbo.json`).
- Applications live under `apps/` (e.g., `apps/nova-agent`, `apps/vibe-code-studio`, `apps/desktop-commander-v3`).
- Backend services live under `backend/` (IPC/LSP proxies, workflow engine, search service).
- Shared libraries and configs sit in `packages/` (e.g., `shared-utils`, `shared-config`, `ui`, `nova-*`, `vibetech-*`).
- Scripts and tooling root-level (`scripts/`, `*.ps1`), docs under `docs/`, global configs at repo root.

## Build, Test, and Development Commands

- `pnpm install` — install workspace dependencies; required before any other command.
- `pnpm dev:nova` / `pnpm dev:vibe` — run Nova Agent or Vibe Code Studio in watch/dev mode.
- `pnpm build` — Turborepo orchestrated build across packages; use `pnpm build:all` to rebuild from scratch.
- `pnpm test` — run vitest suites via Turborepo; `pnpm test:all` forces rebuild first.
- `pnpm lint` / `pnpm lint:fix` — lint (and optionally auto-fix) with ESLint. `pnpm format` / `pnpm format:check` run Prettier.
- `pnpm typecheck` — TypeScript project references/strictness pass.
- For package-specific work, scope with `pnpm --filter <package> <command>` (e.g., `pnpm --filter shared-utils test`).

## Coding Style & Naming Conventions

- TypeScript-first; JS allowed for tooling. Prefer functional components/hooks for React code.
- Formatting: Prettier defaults (2-space indent, single quotes per config, trailing commas). Run `pnpm format` before PRs.
- Linting: ESLint flat config with strict security rules (no `eval`, no `localStorage` in Electron contexts), prefer `const`, avoid unused vars (`_` prefix allowed for intentional ignores).
- Naming: kebab-case for folders, PascalCase for components/classes, camelCase for functions/vars; suffix React files with `.tsx`.

## Testing Guidelines

- Framework: Vitest with coverage emitted to `coverage/` (cached by Turborepo).
- Place unit tests alongside sources or under `__tests__/` with `.test.ts[x]` suffix.
- Keep tests deterministic; mock network/process boundaries. For new features, add at least one happy-path and one failure/edge test.
- Run `pnpm test` before commits; ensure coverage not reduced for touched areas.

## Commit & Pull Request Guidelines

- Follow Conventional Commits seen in history: `feat(scope): ...`, `fix(scope): ...`, `chore: ...`, `build: ...`.
- Keep commits scoped and reversible; avoid bundling unrelated refactors with feature work.
- PRs should include: clear summary, linked issue/story ID, testing notes (`pnpm test`, `pnpm lint`), and screenshots for UI changes.
- Update relevant docs/configs when behavior or contracts change; include `changeset` when publishing packages.

## Security & Configuration Tips

- Copy `.env.example` to `.env`; never commit secrets. Use process envs for tokens/keys.
- Avoid direct filesystem/network access in shared packages unless guarded and abstracted.
- Electron/desktop surfaces must avoid `localStorage`; prefer secure storage mechanisms already used in backend/services.

## Nova Agent - Primary AI Development Assistant

**Nova Agent** is Bruce's 24/7 context-aware AI development assistant. It combines:

- Cursor-like code assistance
- Desktop Commander-like system access
- RescueTime-like activity tracking
- Devin-like autonomous execution

### Nova Agent Location & Documentation

- **Source:** `projects/active/desktop-apps/nova-agent-current/`
- **Quick Reference:** `projects/active/desktop-apps/nova-agent-current/AGENTS.md`
- **Full Specification:** `projects/active/desktop-apps/nova-agent-current/NOVA_AGENT_COMPLETE_SPEC.md`

### Critical Storage Rules for Nova

```
C:\dev\         = ALL CODE (source, configs, repos)
D:\databases\   = ALL DATA (DBs, logs, learning, large files)

Databases:
- D:\databases\nova_activity.db    - Activity tracking, deep work
- D:\databases\agent_learning.db   - Learning system, patterns
- D:\databases\agent_tasks.db      - Tasks, projects, completion
```

### Nova Core Capabilities

1. **Context Awareness** - Always-on monitoring of windows, files, git, processes
2. **Persistent Memory** - Cross-session memory with semantic search
3. **Task Tracking** - Prevents duplicate work by tracking all tasks
4. **Full System Access** - Read/write/execute with multi-file atomic operations
5. **Learning System** - Adapts based on usage patterns and mistakes

## IPC Bridge Integration (Nova Agent ↔ Vibe Code Studio)

- **WebSocket Bridge:** ws://127.0.0.1:5004 (embedded in Vibe's Electron main process)
- **Shared Database:** D:\databases\agent_learning.db (SQLite with WAL mode for concurrent access)
- **Message Types:** `file:open`, `learning:sync`, `context:update`, `activity:sync`
- **Architecture:** Nova (Rust WebSocket client) → Vibe (Electron WebSocket server) → Renderer (IPC bridge)
- **Learning Sync:** Bidirectional sync of agent_mistakes and agent_knowledge tables
- **Auto-reconnect:** Nova reconnects with exponential backoff (max 10 attempts)
- **See app-specific AGENTS.md files:**
  - `projects/active/desktop-apps/nova-agent-current/AGENTS.md` - Nova specification
  - `apps/vibe-code-studio/AGENTS.md` - Vibe IPC bridge & frontend integration

## Voice-to-IPC Integration (Production Ready - 2025-11-28)

Nova Agent now includes production-ready voice control with comprehensive IPC integration:

### Architecture

```
User Voice Input → Web Speech API → Error Boundaries → useVoiceCommands Hook
→ Performance Monitor → IPC Message Queue (with retry) → Offline Handler
→ WebSocket Bridge → Target Application
```

### Key Features

- **E2E Test Coverage:** Mock Web Speech API for consistent testing
- **Error Resilience:** React error boundaries with graceful degradation
- **Message Reliability:** Exponential backoff retry (1s → 30s) with dead letter queue
- **Offline Mode:** Auto-reconnect with LocalStorage persistence
- **Performance:** <300ms voice-to-IPC latency (avg/median/p95 tracking)
- **16 Voice Commands:** File ops, task management, project switching, navigation, learning
- **Command Discovery:** Searchable UI with 7 categories and examples
- **Multi-language:** 8 languages supported (EN, ES, FR, DE, IT, JA, ZH)
- **Visual Feedback:** Animated microphone, waveform, transcript, command toasts

### Browser Support

- Chrome 25+ (full support)
- Edge 79+ (full support)
- Safari 14.1+ (limited - no continuous mode)
- Firefox (graceful fallback - no Web Speech API)

### Implementation Stats

- **25 Files:** ~5,300 lines of production code
- **Documentation:** 890-line developer guide (docs/VOICE_COMMANDS.md)
- **Test Coverage:** 910 lines (E2E, integration, unit)
- **Performance:** All targets met (<300ms)

### Key Files

- `packages/shared-ipc/src/queue.ts` - Message queue with retry
- `packages/shared-ipc/src/offline-handler.ts` - Connection management
- `src/components/voice/VoiceControlPanel.tsx` - Main UI
- `src/services/VoicePerformanceMonitor.ts` - Performance tracking
- `docs/VOICE_COMMANDS.md` - Complete command reference

### Documentation

- **Complete Spec:** `NOVA_V2_VOICE_IPC_IMPLEMENTATION_COMPLETE.md`
- **Command Reference:** `docs/VOICE_COMMANDS.md`
- **Learning Data:** `D:\databases\learning\nova-voice-ipc-integration-learnings.json`

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

## Codex CLI Integration

This monorepo is optimized for use with OpenAI Codex CLI, a terminal-based coding agent.

### Codex Configuration

The Codex CLI is configured via `~/.codex/config.toml` with the following optimizations:

**Model**: `gpt-5.1-codex-max` (primary) with profiles for different workflows
**Approval Policy**: `on-failure` - Codex asks for permission when commands fail in sandbox
**Sandbox Mode**: `workspace-write` with experimental Windows sandbox enabled
**Context Window**: 192K tokens for large-scale monorepo navigation

### MCP Servers Available to Codex

The following Model Context Protocol (MCP) servers are configured:

1. **filesystem** - Access to C:\dev (entire monorepo)
2. **filesystem-data** - Access to D:\ drive (logs, databases, data, learning)
3. **sqlite** - Database operations in D:\databases
4. **desktop-commander** - Custom Windows automation via Desktop Commander v3
5. **github** - GitHub PR and issue management (requires GITHUB_TOKEN)

### Workspace Navigation with Codex

When using Codex in this monorepo:

- **Launch from C:\dev**: `codex` or `codex --cd C:\dev`
- **Use profiles**: `codex --profile crypto` for trading system work
- **Workspace-aware**: Codex automatically detects pnpm workspaces and Nx configuration
- **AGENTS.md discovery**: Codex reads AGENTS.md files hierarchically (root → project-specific)

### Data Storage Requirements

**CRITICAL**: Codex is configured to respect the D:\ drive mandate:

- All logs MUST go to D:\logs
- All databases MUST go to D:\databases
- All data files MUST go to D:\data
- All learning systems MUST go to D:\learning-system

The filesystem MCP server enforces this via writable_roots in sandbox configuration.

### Best Practices for Codex Usage

1. **Incremental Tasks**: Break large refactorings into <10 file changes per turn
2. **AGENTS.md Updates**: Keep project-specific AGENTS.md files updated with conventions
3. **Nx Integration**: Use `pnpm nx <task> <project>` commands for workspace operations
4. **Profile Selection**: Choose appropriate profile based on risk level:
   - `default` - Balanced for general development
   - `crypto` - High caution for financial code
   - `quick` - Fast experiments with read-only sandbox
   - `production` - Maximum safety for deployments

### Codex Authentication

Authenticate Codex CLI with your ChatGPT Plus/Pro account:

```bash
codex
# Select "Sign in with ChatGPT"
# Receive $5 (Plus) or $50 (Pro) in API credits
```

Or use API key authentication:

```bash
export OPENAI_API_KEY="your-api-key"
codex
```
