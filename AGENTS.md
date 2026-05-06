<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Project Overview

This is **VibeTech Monorepo** (`@vibetech/workspace`), a large-scale, multi-platform software ecosystem developed on Windows. It is an Nx-managed pnpm workspace containing ~24 applications and ~27 shared libraries, with additional backend services, MCP servers, and automation tooling.

The project spans multiple runtime targets and languages:

- **Web**: React 19 single-page applications built with Vite
- **Desktop**: Tauri 2 (Rust + React) and Electron (Node + React) applications
- **Mobile**: Capacitor Android apps and Expo/React Native applications
- **Backend / Services**: Node.js/TypeScript APIs, Express/Fastify/Hono servers, Python/FastAPI services
- **MCP Servers**: Model Context Protocol servers exposing tools, resources, and prompts to LLM clients
- **Infrastructure**: IPC bridges, LSP/DAP proxies, OpenRouter proxy, workflow engines

Key products include **NOVA Agent** (Tauri desktop AI assistant), **Vibe Code Studio** (Tauri AI code editor), **Vibe Tutor** (Electron + Capacitor education platform), **Gravity Claw** (local-only AI agent orchestrator WIP), and various SaaS tools (invoice automation, booking platforms, chess tutoring).

The canonical repository is hosted on GitHub at `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`.

# Technology Stack

| Layer               | Technology                                                 |
| ------------------- | ---------------------------------------------------------- |
| **Monorepo**        | Nx 22.7.1 + pnpm 10.33.0 workspaces                        |
| **Package Manager** | pnpm (hoisted linker, `shamefully-hoist=true`)             |
| **Runtime**         | Node.js >=22.0.0                                           |
| **Language**        | TypeScript 5.9.3 (strict mode), Python 3.13, Rust (stable) |
| **Framework**       | React 19.2.4                                               |
| **Bundler**         | Vite 7.3.1 (SWC plugin)                                    |
| **Styling**         | Tailwind CSS 4.1.18 + PostCSS + tailwindcss-animate        |
| **UI Components**   | Radix UI primitives, shadcn/ui patterns, Framer Motion     |
| **State / Form**    | React Hook Form + Zod + TanStack Query                     |
| **Testing**         | Vitest 4.1.2 (jsdom) + Playwright 1.58.2 (E2E) + pytest    |
| **Linting**         | ESLint 9 (flat config) + Biome 2.4.9 + Prettier 3.8.1      |
| **3D / Graphics**   | Three.js + React Three Fiber                               |
| **Desktop**         | Tauri 2.0 (Rust) + Electron 33/35/40 by app                |
| **Mobile**          | Capacitor 8 + Expo SDK 54 / React Native 0.81              |
| **Release**         | Changesets + Nx release (independent versioning)           |

# Monorepo Architecture & Code Organization

The workspace uses **Nx** with `appsDir: "apps"` and `libsDir: "packages"`.

## Applications (`apps/`)

Product applications and standalone services:

| App                              | Type                              | Stack                        |
| -------------------------------- | --------------------------------- | ---------------------------- |
| `nova-agent`                     | Tauri Desktop                     | React + Rust + SQLite + RAG  |
| `vibe-code-studio`               | Tauri Desktop                     | React + Rust + Monaco Editor |
| `vibe-tutor`                     | Electron 35.7 + Capacitor 8       | React + Express + Android + electron-builder |
| `vibe-justice`                   | Tauri 2 frontend + Python backend | React + Vite + FastAPI + PyInstaller `.spec` |
| `gravity-claw`                   | Local-only WIP nested repo        | React + Hono + Tauri scripts; pnpm-workspace excluded |
| `vibetech-command-center`        | Electron 33 Desktop (Tier 1/beta) + Control Plane | React + electron-vite + electron-builder + better-sqlite3 + MCP server (`tsconfig.mcp.json`, scripts: `mcp:start`, `probe:claude`, `probe:mcp`) |
| `business-booking-platform-next` | React SPA (Vite) + Node backend   | No root/frontend package.json; backend package only |
| `invoice-automation-saas`        | React SPA + Fastify               | React + Fastify + Stripe     |
| `vibe-shop`                      | Next.js 16.1.6 storefront         | Next + Prisma + Neon         |
| `cross-agent-reflection`         | Full-stack React + Express        | React + Express              |
| `prompt-engineer`                | Full-stack React + Express        | React + Express + OpenAI     |
| `chessmaster-academy`            | React SPA + Capacitor + Express   | React + chess.js + Android   |
| `shipping-pwa`                   | React PWA + Capacitor             | React + Cloudflare Workers   |
| `VibeBlox`                       | React SPA + Hono                  | React + Hono + SQLite        |
| `vibe-tech-lovable`              | React SPA (Vite)                  | React + shadcn/ui + Three.js |
| `nova-mobile-app`                | React Native (Expo 54)            | React Native 0.81 + Zustand  |
| `crypto-enhanced`                | Python Service                    | Python + Kraken API + SQLite; root scripts manage Nx targets |
| `desktop-commander-v3`           | MCP Server                        | TypeScript + MCP SDK         |
| `mcp-gateway`                    | MCP Server                        | TypeScript + MCP SDK         |
| `mcp-rag-server`                 | MCP Server                        | TypeScript + LanceDB         |
| `mcp-skills-server`              | MCP Server                        | TypeScript + MCP SDK         |
| `memory-mcp`                     | MCP Server                        | TypeScript + LanceDB         |
| `workspace-mcp-server`           | MCP Server                        | TypeScript + MCP SDK         |
| `agent-engine`                   | CLI / Node Tool                   | TypeScript + tsup            |

Two package workspaces are excluded from `pnpm-workspace.yaml`: `apps/gravity-claw`
(local-only nested WIP, not a shipped workspace release) and `packages/games`.
`packages/nova-core` currently has no `package.json`; do not treat it as a
workspace package until a manifest exists.

### Control Plane Features (vibetech-command-center)

The command-center app hosts the VibeTech Control Plane — a single-pane-of-glass operations console for the monorepo:

1. **Affected Intelligence Dashboard** — Pre-commit impact analysis using `nx affected`. Shows affected projects, dependency subgraph, health scores (0-100), and risk flags (CROSS_TIER_1, HIGH_FAN_OUT, BUILD_STALE, NO_TEST_COVERAGE).
2. **DB Explorer** — Read-only SQLite browser for workspace databases. Schema introspection, safe query runner (SELECT/WITH only, 5s timeout, 1,000-row cap), and DB inventory integration.
3. **Agent Orchestrator** — MCP server health monitoring (7 servers), Nx task launcher (build/test/lint/typecheck/dev/e2e), process grid with kill/restart, and searchable log stream (5,000-line ring buffer).
4. **Memory Viz** — Visualizer for `@vibetech/memory` stores. Episodic timeline, semantic explorer with importance bars, procedural patterns table, decay visualization (keep/summarize/prune), and cross-store vector search.

## Shared Libraries (`packages/`)

| Package                       | Scope    | Purpose                                                                |
| ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `@vibetech/shared`            | VibeTech | Shared components for NOVA / VCS (agents, DB, AI, learning, IPC)       |
| `@vibetech/ui`                | VibeTech | Shared UI components and design tokens                                 |
| `@vibetech/vcs-theme`         | VibeTech | Vibe Code Studio design tokens                                         |
| `@vibetech/avatars`           | VibeTech | Avatar types, data, and `AvatarImage` component                        |
| `@vibetech/hooks`             | VibeTech | Shared React hooks                                                     |
| `@vibetech/types`             | VibeTech | Shared TypeScript types (tasks, errorfix, multifile)                   |
| `@vibetech/testing-utils`     | VibeTech | Shared testing utilities, fixtures, mocks                              |
| `@vibetech/logger`            | VibeTech | Structured JSON logging                                                |
| `@vibetech/shared-config`     | VibeTech | Zod-validated env and path utilities                                   |
| `@vibetech/shared-utils`      | VibeTech | Utilities (UI, security, browser, AI safety)                           |
| `@vibetech/shared-ipc`        | VibeTech | IPC message schemas and offline handlers                               |
| `@vibetech/service-common`    | VibeTech | Microservice utilities, middleware, DeepSeek client                    |
| `@vibetech/backend`           | VibeTech | Vector store, embedding, IPC client                                    |
| `@vibetech/db-app`            | VibeTech | SQLite app database adapter with WAL                                   |
| `@vibetech/inngest-client`    | VibeTech | Shared Inngest client and event types                                  |
| `@vibetech/openrouter-client` | VibeTech | TypeScript client for OpenRouter proxy                                 |
| `@vibetech/agent-lats`        | VibeTech | MCTS planning for autonomous agents                                    |
| `@vibetech/memory`            | VibeTech | Episodic, semantic, procedural memory + vector search                  |
| `@vibetech/openclaw-bridge`   | VibeTech | OpenClaw gateway bridge client                                         |
| `@vibetech/mcp-core`          | VibeTech | Core types and utilities for MCP servers                               |
| `@vibetech/mcp-testing`       | VibeTech | Testing utilities for MCP servers                                      |
| `@vibetech/games`             | VibeTech | Game logic and components (chess, sudoku, 3D)                          |
| `@nova/types`                 | Nova     | NOVA Agent shared TypeScript types                                     |
| `@nova/database`              | Nova     | NOVA Agent SQLite database services                                    |
| `@vibetech/feature-flags-*`   | VibeTech | Feature flags core, server, Node SDK, React SDK, dashboard, Python SDK |

## Backend Services (`backend/`)

| Service               | Purpose                           | Port |
| --------------------- | --------------------------------- | ---- |
| `openrouter-proxy`    | Centralized OpenRouter API proxy  | 3001 |
| `ipc-bridge`          | WebSocket bridge (NOVA ↔ VCS)     | 5004 |
| `dap-proxy`           | Debug Adapter Protocol proxy      | 5003 |
| `lsp-proxy`           | Language Server Protocol proxy    | 5002 |
| `prompt-engineer`     | Prompt optimization API           | 9001 |
| `symptom-tracker-api` | Symptom tracker backend           | —    |
| `workflow-engine`     | Multi-step workflow orchestration | 5003 |
| `nova-sqlite-mcp`     | Read-only MCP server for Nova DB  | —    |
| `config`              | Shared backend config             | —    |
| `middleware`          | Shared security middleware        | —    |
| `llm-finetuning`      | Python fine-tuning pipeline       | —    |

# Build, Test & Development Commands

Run commands from `C:\dev` unless a project-specific document says otherwise.

```powershell
pnpm install
pnpm exec nx show projects
pnpm nx graph
pnpm nx dev <project>
pnpm nx build <project>
pnpm nx lint <project>
pnpm nx test <project>
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run quality:affected
pnpm run workspace:health
pnpm run paths:check
pnpm run learning:validate
```

The root `pnpm run build` script intentionally fails. Use `pnpm nx build <project>` or a project-specific build command instead.

If PowerShell cannot launch `node`, `pnpm`, `git`, `cmd.exe`, or `whoami.exe`, repair the process environment first:

```powershell
. .\scripts\Initialize-DevProcessEnvironment.ps1
Initialize-DevProcessEnvironment
```

## Key Root Scripts

| Script                             | Command                               |
| ---------------------------------- | ------------------------------------- |
| `dev`                              | `nx run @vibetech/command-center:dev` |
| `lint` / `lint:biome` / `lint:fix` | ESLint + Biome linting                |
| `format`                           | `biome format --write .`              |
| `test:unit`                        | `vitest run`                          |
| `test:e2e`                         | `playwright test`                     |
| `typecheck`                        | `nx run-many -t typecheck`            |
| `quality:affected`                 | `nx affected -t lint typecheck build` |

# Testing Strategy

The monorepo uses a multi-layered testing approach:

| Layer         | Tool                    | Usage                                                                                                |
| ------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **Unit**      | Vitest 4.1.2            | Primary runner for TS/JS. Co-located tests: `Component.test.tsx` next to source.                     |
| **Component** | Testing Library + jsdom | React component testing in Vitest environment.                                                       |
| **E2E**       | Playwright 1.58.2       | Browser automation, visual regression, and full user-flow testing.                                   |
| **Python**    | pytest                  | Python services (`crypto-enhanced`, `vibe-justice/backend`).                                         |
| **Coverage**  | @vitest/coverage-v8     | Target: 80% lines/functions/branches/statements minimum. Critical code (e.g., trading) targets 95%+. |

## Playwright Configuration

- **Test Dir**: `./e2e` (root), or app-specific `e2e/` / `tests/` folders.
- **Retries**: 2 on CI, 0 locally.
- **Workers**: 1 on CI, auto locally.
- **Browsers**: Chromium, Firefox, WebKit.
- **Visual Regression**: Enabled in `nova-agent` (`maxDiffPixelRatio: 0.002`).

## CI Testing Behavior

- The main CI pipeline (`ci.yml`) runs `lint`, `typecheck`, `test`, and `build` only on **affected** projects against `origin/main`.
- E2E tests are restricted to `workflow_dispatch` for legacy suites; app-specific E2E runs via per-app workflows.
- Flaky tests must be recorded in `quarantine.json`.

## Agent Evaluation Tests

- **Location**: `tests/agent-evaluation/`
- **Focus**: Web search grounding (80 tests) and No-Duplicates behavioral compliance (80 tests).
- **Target**: ≥95% standard tests, ≥90% adversarial resistance, zero hallucinated sources.
- **Run**: `.\run-web-search-grounding-tests.ps1 -TestCategory "all"`

## Control Plane Tests

- **Control Plane tests** — Vitest + Testing Library for renderer panels, unit tests for main-process services. 40+ tests covering Affected Intelligence; DB Explorer, Agent Orchestrator, and Memory Viz tests in progress.

# Code Style & Quality Standards

## TypeScript

- **Target**: ES2022, Module: ESNext, Resolution: bundler.
- **Strict Mode**: Full strict enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess`).
- **JSX**: `react-jsx`.
- **No explicit `any`** without a justification comment.
- **Prefer `@/` alias** for `src` imports; avoid deep relative paths (`../../../`).
- **Async-first** with `async/await`; avoid blocking callbacks.

## File Size & Structure

- **Max 500 lines per file** (target +/- 100). Split components and logic early.
- **Max ~50 lines per function** when possible.
- **Comments explain why, not what.**
- **No emojis** in code comments or commit messages.

## Linting & Formatting

| Tool         | Role                                  | Key Config                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ESLint 9** | TypeScript + React linting            | Flat config (`eslint.config.js`). Extends `@eslint/js/recommended`, `typescript-eslint/strict`, `typescript-eslint/stylistic`. Bans `eval`, `no-new-func`, `React.FC`, namespace imports. Custom rule `no-localstorage-electron` for desktop apps. |
| **Biome**    | Fast formatting + import organization | `biome.json`. 2-space indent, LF, line width 100, single quotes, trailing commas `all`.                                                                                                                                                            |
| **Prettier** | Secondary formatting                  | `.prettierrc`. Print width 100, single quotes, trailing commas `all`, LF.                                                                                                                                                                          |

### Per-Project Overrides

- **Relaxed linting** for legacy projects: `desktop-commander-v3`, `clawdbot-desktop`, `vibetech-shared`, `invoice-automation-saas`, `prompt-engineer`, `business-booking-platform/backend`, `shipping-pwa`, `nova-mobile-app`.
- **Fully off** for `packages/games`.

## Styling

- **Tailwind CSS 4.1.18** with PostCSS.
- **Dark mode**: `class` strategy.
- **Custom theme**: Extensive `aura`, `futuristic`, `sidebar` palettes, neon glow animations.

# Security Considerations

- **Electron Security**: Custom ESLint rule `no-localstorage-electron` prevents `localStorage` usage in Electron contexts across `apps/nova-agent/**`, `apps/vibe-code-studio/**`, and `apps/**/electron/**`.
- **Code Injection**: ESLint bans `eval`, `no-implied-eval`, `no-new-func`, and `no-script-url`.
- **Crypto / Trading**: `apps/crypto-enhanced` is **observation-only** unless explicit task-specific authorization is given. Never execute buy, sell, or trade actions without user confirmation. Circuit breakers and position limits are enforced.
- **Secrets**: Never commit API keys. Use `.env.example` for templates. Trading state and databases live on `D:\`.
- **Path Safety**: Code lives on `C:\dev`; runtime data (databases, logs, learning artifacts) lives on `D:\`. Any code writing files must default to `D:\` locations.
- **Database Safety**: SQLite on `D:\databases` with WAL mode. Parameterized queries only. Explicit migrations required.

# Deployment & CI/CD

## GitHub Actions Workflows

| Workflow                              | Trigger                                   | Purpose                                                                                                                                       |
| ------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                              | Push/PR to `main`, `develop`, `feature/*` | Main quality pipeline: dependency review, sync audit, affected lint/typecheck/test/build, changeset check, release, coverage, canary Node 24. |
| `release.yml`                         | `workflow_dispatch`                       | Legacy gravity-claw version workflow; verify nested/local-only state before use.                                                              |
| `nova-agent-visual.yml`               | Path-filtered to `apps/nova-agent/**`     | Stylelint + Playwright visual regression.                                                                                                     |
| `vibe-justice.yml`                    | Path-filtered to `apps/vibe-justice/**`   | Frontend (Nx) + Backend (pytest) validation.                                                                                                  |
| `vibe-tutor-privacy-policy-pages.yml` | Push to `main`                            | Deploys static pages to GitHub Pages.                                                                                                         |

## CI Policies

- **Runner**: `windows-latest` (primary development environment is Windows 11).
- **Nx Cloud**: Enabled, ID `6977fcd7ceb01e5b11be2a95`. Self-healing (`nx fix-ci`) on PRs.
- **Actions**: Pinned to commit SHAs. Least-privilege permissions. Concurrency groups cancel in-progress runs.
- **Self-Healing**: Configured in `.nx/SELF_HEALING.md`. Auto-applies drift corrections via `nx fix-ci`.

## Release Process

- **Strategy**: Independent versioning via Changesets + Nx release.
- **Scope**: `packages/*`, excluding `vibe-python-shared`.
- **Specifier Source**: Prompt-driven (`nx release` asks for version bumps).

## Local-Only Data Policy

- Do not commit live databases, packaged binaries, generated media, or `.env` files.
- `.env.example` or templates are used for configuration samples.
- Build outputs (`dist/`, `build/`, `target/`, `release/`) are local-only.

# Local + GitHub Workflow Rule

- Treat the local working tree as the primary source of truth.
- Prefer local workflows and local validation commands first.
- Prefer GitHub workflows/remotes when repository hosting is relevant.

# Workspace Snapshot

- Repository root: `C:\dev`.
- Repository host: GitHub, `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`.
- Package manager: `pnpm@10.33.0` only.
- Node: `>=22.0.0`; current local toolchain is Node 22.x.
- Build system: `nx@22.7.1` with apps in `apps/` and libraries in `packages/`.
- Primary languages: TypeScript, JavaScript, Python, Rust, and React.
- Shared runtime data, logs, databases, and learning artifacts live on `D:\`, not under `C:\dev`.

Canonical workspace references:

- `AI.md` - workspace rules and path policy.
- `WORKSPACE.json` - current stack, project registry, and focus areas.
- `docs/WORKSPACE_STRUCTURE.md` - source vs local-only storage policy.
- `docs/ai/RULES.md` - detailed development and agent rules.

# Current Layout

- `apps/` - product apps, desktop apps, mobile apps, MCP servers, and infrastructure services.
- `backend/` - backend services and service-specific packages.
- `packages/` - shared libraries, UI, config, memory, MCP utilities, and feature flags.
- `scripts/` - reusable Windows and workspace maintenance scripts.
- `tests/` - cross-workspace tests and agent evaluation suites.
- `tools/` - local automation and maintenance tools.

Do not treat nested app folders as separate git repos unless their own git root is
verified. The root working tree is the default source of truth.

# Development Rules

- Search before creating files, services, components, routes, scripts, or docs.
- Prefer modifying the existing implementation over adding a parallel duplicate.
- Use `git ls-files`, `rg`, `Get-ChildItem`, or `Select-String` to find existing patterns before editing.
- Do not install new dependencies without discussion.
- Keep changes scoped to the requested project and its direct shared dependencies.
- Preserve backwards compatibility unless the user explicitly asks for a breaking change.
- Use TypeScript types for TypeScript code and keep strict-mode assumptions intact.
- Prefer async/await over raw promise chains.
- Follow project-local patterns before introducing new abstractions.
- Add or update tests when behavior changes.
- Use `apply_patch` for manual edits.

# No Duplicates Rule

Before creating anything new:

1. Search for similar files and functionality.
2. Read the existing implementation when a similar match exists.
3. Modify existing code when it already owns the behavior.
4. Create a new file only when the feature is truly new or the user confirms that a separate implementation is wanted.

This applies to source files, tests, docs, scripts, services, handlers, components, functions, and configuration.

# Validation Guidance

- Prefer Nx targets over direct tool commands for build, lint, test, typecheck, and e2e work.
- For changed projects, prefer narrow validation first: `pnpm nx <target> <project>`.
- For repo-level confidence, use `pnpm run quality:affected` before broad all-project runs.
- For Python-only `apps/crypto-enhanced`, use that app's maintained runner instead of raw host `pytest` when available.
- If validation is blocked by local toolchain state, record the exact command and error rather than reporting success.

# Learning System

Current learning-system sources of truth:

- Active learning database: `D:\databases\agent_learning.db`.
- Canonical database inventory: `D:\databases\DB_INVENTORY.md`.
- Learning-system guide: `D:\learning-system\enhanced_agent_guidelines.md`.
- Learning-system workspace: `D:\learning-system`.

Before changing repair, maintenance, database, memory, or hook flows:

- Validate the current path against `D:\databases\DB_INVENTORY.md`.
- Do not recreate retired databases to satisfy stale scripts.
- Prefer updating existing maintenance scripts under `C:\dev\scripts`.
- Treat `D:\learning-system` as local code/docs/artifact state, not as the home of live runtime databases.

# Safety Protocols

MoltBot and crypto operations are observation-only unless the user gives explicit,
task-specific authorization for non-trading maintenance. Never execute buy, sell,
or trade actions.

When monitoring Gmail or hook-driven notifications, enforce a 5-minute deduplication
window and avoid repeated identical alerts.

Retention defaults:

- Config backups: 14 days.
- Memory snapshots: 30 days.

# Documentation Maintenance

When project reality changes, update this file together with the relevant source of truth:

- Stack, commands, and project registry: `WORKSPACE.json` and `package.json`.
- Path and storage policy: `AI.md` and `docs/WORKSPACE_STRUCTURE.md`.
- Database ownership: `D:\databases\DB_INVENTORY.md`.
- Learning-system workflow: `D:\learning-system\enhanced_agent_guidelines.md`.
