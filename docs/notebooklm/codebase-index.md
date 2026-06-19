# VibeTech Monorepo — Codebase Index (live-tree verified 2026-06-18)

This is the master map / table of contents for the VibeTech monorepo NotebookLM. It is a
single self-contained source: it lists every workspace member, classifies each app by type,
groups the shared packages, and summarizes the engineering standards that govern the
codebase. It exists so the NotebookLM can answer "what apps exist, what kind is each, and
what are the rules" without needing any other document. It is intentionally link-free: each
NotebookLM source is uploaded standalone, so there are no markdown links or relative paths to
other docs here.

> SUPERSEDES and invalidates the following stale documents (delete them from any
> NotebookLM / knowledge-base context): "CANONICAL FACTS (disk-verified) 2026-06-16",
> "VibeTech Ecosystem Review and System Health Audit 2026", "source1_vtde_status.md",
> "source_vtde.md", "claudecode06142026". Those contain FALSE state — a live `apps/vtde`
> Tauri app, a `WORKSPACE.json`, a `guard-protect-source.ps1` "error". The live
> `V:\monorepo` filesystem is the only source of truth.

How to read claims from any AI grounded only in uploaded docs: it CANNOT see the live
filesystem, run PowerShell, or observe hooks. Any statement like "disk-verified", "system
health sweep confirmed", or "the hook error you encountered" is an inference from uploaded
text, not an observation. Trust the live tree over any such claim.

## Workspace facts

- Root: `V:\monorepo`. Branch: `main`.
- Tooling: pnpm 10.33.0 + Nx 22.7.1. TypeScript 5.9 strict.
- Hard rule: ALL source on `V:\monorepo`; ALL data (databases, logs, learning-system) on
  `D:\`. Never mixed.
- Counts (verified by enumerating `package.json` under each glob in `pnpm-workspace.yaml`):
  - `apps/`: 46 workspace members = 40 real apps + 6 app-factory smoke/test fixtures.
  - `packages/`: 34 shared packages.
- Also on disk but NOT in the 46-app count: `apps/crypto-enhanced` (Python crypto trading
  system, not a workspace member) and `apps/gravity-claw` (explicitly workspace-excluded
  local-only WIP per `pnpm-workspace.yaml`).
- "VTDE" is the LEGACY NAME of `apps/vibetech-command-center` — ONE Electron app, not two.
  `apps/vtde` does not exist; there is no separate Tauri desktop-OS shell.

## Apps by type (46)

Each row gives the directory name and a one-line purpose. Purposes marked "(inferred)" were
derived from the directory name and project context because the app's `package.json` has no
`description` field; the rest are taken from the app's `package.json` description.

### Websites (3)

| App | Purpose |
| --- | --- |
| `vibe-shop` | Next.js 16 e-commerce storefront, 100% DB-backed via Neon serverless Postgres (inferred) |
| `vibe-tech-marketing` | VibeTech marketing / brand website (inferred) |
| `factory-landing-smoke` | App-factory smoke fixture: generated landing-page template (inferred) |

### Web SPA (5)

| App | Purpose |
| --- | --- |
| `prompt-engineer` | Prompt-engineering workbench SPA with companion server on port 3085 (inferred) |
| `vibe-blox` | Token-based incentive system for developmental growth (gamified learning) |
| `serenity-flow` | Wellness / mindfulness flow web app (inferred) |
| `vibe-reflection` | Personal reflection / journaling SPA (inferred) |
| `vibe-tech-lovable` | Lovable-generated VibeTech web SPA (inferred) |

### SaaS (10 real + 4 smoke)

| App | Purpose |
| --- | --- |
| `cme-track` | Continuing medical education (CME) credit tracking SaaS (inferred) |
| `prior-auth-pro` | Healthcare prior-authorization workflow SaaS (inferred) |
| `proposal-review-saas` | Proposal / document review SaaS (inferred) |
| `vibe-booking-backend` | Backend service for the Vibe booking platform (inferred) |
| `vibe-booking-v2` | Second-generation hotel/appointment booking SaaS (inferred) |
| `vibe-dental` | Dental practice management SaaS (inferred) |
| `vibe-discharge` | Patient discharge / care-handoff SaaS (inferred) |
| `vibe-invoice` | Invoice automation SaaS (inferred) |
| `vibe-portal` | Customer/client portal SaaS (inferred) |
| `vibe-reminder` | Appointment / task reminder SaaS (inferred) |
| `vibe-reminder-v2` | Second-generation reminder SaaS (inferred) |
| `_-factory-runtime-smoke` | App-factory smoke fixture: generated runtime template (inferred) |
| `factory-saas-smoke` | App-factory smoke fixture: generated SaaS template (inferred) |
| `factory-verify` | App-factory verification fixture (inferred) |
| `test-factory-app` | App-factory test fixture (inferred) |

### Mobile — Android (3)

| App | Purpose |
| --- | --- |
| `nova-mobile-app` | Android companion app for the Nova Agent assistant (inferred) |
| `vibe-chess` | Android chess application (inferred) |
| `vibe-tutor-mobile` | Vibe-Tutor AI homework helper, Android build (inferred) |

### PWA (1)

| App | Purpose |
| --- | --- |
| `vibe-shipping` | Shipping / logistics progressive web app (inferred) |

### Windows Desktop — Tauri v2 (5)

| App | Purpose |
| --- | --- |
| `nova-agent` | Neural Omnipresent Virtual Assistant — personalized AI agent with memory and project management |
| `vibe-code-studio` | Next-generation AI-powered code editor (Monaco) where innovation meets elegant design |
| `vibe-justice` | Legal / case-management Tauri desktop app (inferred) |
| `vibe-tutor` | Vibe-Tutor AI homework helper, Tauri desktop build (inferred) |
| `factory-tauri-smoke` | App-factory smoke fixture: generated Tauri template (inferred) |

### Windows Desktop — Electron (1)

| App | Purpose |
| --- | --- |
| `vibetech-command-center` | Vibe-Tech Command Center — monorepo dashboard, diagnostics, and Claude Code bridge (legacy name "VTDE"; Electron 33; dev port 5177) |

### MCP servers (10)

| App | Purpose |
| --- | --- |
| `desktop-commander-v3` | MCP server with unrestricted terminal access (PowerShell/CMD) for AI agents |
| `learning-pipeline-mcp` | MCP server for orchestrating the learning-system insight-to-skill pipeline |
| `mcp-gateway` | MCP gateway bridging OpenClaw (Brain) with Antigravity MCP servers via IPC bridge |
| `mcp-rag-server` | MCP server exposing the Nova-Agent RAG pipeline to Claude Desktop / Claude Code |
| `mcp-skills-server` | MCP server exposing the agent skills system to any compliant LLM (Claude, Gemini, Copilot) |
| `memory-mcp` | MCP server exposing the VibeTech memory system to Claude Code |
| `monorepo-health-mcp` | MCP server for monorepo health, database health, workspace paths, and system maintenance |
| `proactive-recommendations-mcp` | MCP server for retrieving, dismissing, and creating tasks from proactive agent recommendations |
| `skill-feedback-mcp` | MCP server tracking skill performance, user ratings, and variant recommendations |
| `workspace-mcp-server` | MCP server for workspace config: API keys, ports, servers, plugins, databases, env vars |

### Backend / API (2)

| App | Purpose |
| --- | --- |
| `agent-engine` | Local-first autonomous coding engine with gated self-improvement for the VibeTech Nx monorepo |
| `symptom-tracker-api` | Local-first API backing the Symptom Tracker UI |

### Stub (1)

| App | Purpose |
| --- | --- |
| `vibe-booking` | Empty / stub package (`@vibetech/vibe-booking`); active booking work lives in `vibe-booking-backend` and `vibe-booking-v2` |

### Not counted in the 46 (present on disk only)

| Item | Purpose |
| --- | --- |
| `crypto-enhanced` | Python cryptocurrency trading system (Kraken API); not a pnpm workspace member |
| `gravity-claw` | Local-only WIP, explicitly excluded in `pnpm-workspace.yaml` |

## Packages (34)

Authoritative members: `agent-lats`, `ai`, `analytics`, `auth`, `avatars`, `backend`,
`billing`, `core`, `db-app`, `email`, `emails`, `entitlements`, `feature-flags`, `games`,
`hooks`, `inngest-client`, `landing`, `logger`, `mcp-core`, `mcp-testing`, `memory`,
`monetization`, `nova-database` (`@nova/database`), `nova-types` (`@nova/types`),
`openclaw-bridge`, `openrouter-client`, `payments`, `service-common`, `shared-config`,
`shared-ipc`, `testing-utils`, `types`, `ui`, `vcs-theme`. All are `@vibetech/*` except the
two `@nova/*` noted.

Grouped by role:

- UI / Design: `ui`, `landing`, `avatars`, `vcs-theme`, `games`, `hooks`.
- AI / Agent: `agent-lats` (LATS/MCTS planner), `ai`, `memory`, `mcp-core`,
  `openrouter-client`, `openclaw-bridge`.
- Backend / Data: `backend`, `db-app`, `nova-database` (`@nova/database`), `service-common`,
  `inngest-client`, `logger`, `analytics`.
- Infra / Config: `shared-config`, `shared-ipc`, `feature-flags`, `core`, `types`,
  `nova-types` (`@nova/types`).
- Domain / Business: `auth`, `billing`, `payments`, `monetization`, `entitlements`, `email`,
  `emails`.
- Testing: `testing-utils`, `mcp-testing`.

## Engineering standards

These are the binding rules across the monorepo (from `CLAUDE.md` and `.claude/rules/`):

- Package manager: pnpm ONLY (never npm/yarn, never mixed). Use `--filter <project>` for
  single-project installs; never run bare `pnpm install` inside an app directory. Hoisted
  node-linker; store at `D:\pnpm-store-v2`.
- Path policy: ALL source code on `V:\monorepo`; ALL data on `D:\` (`D:\databases\`,
  `D:\logs\`, `D:\data\`, `D:\learning-system\`). Never put `.db`/`.sqlite`/`.log` files or
  large binaries in the source tree. Always use env vars (e.g. `DATABASE_PATH`,
  `LOGS_PATH`) — never hardcode `D:\...` in source.
- TypeScript patterns (enforced by ESLint + pre-commit): TS 5.9 strict; no
  `import React from 'react'`; no `React.FC<Props>` (type props directly); always
  `import type` for type-only imports; named imports for hooks; export shared types;
  100-char lines; single quotes; async/await over raw promises.
- No-duplicates: search before creating any file/feature/function (Glob + Grep), read what
  exists, modify-first by default; ask the user when modify-vs-create is unclear.
- No mock/placeholder code in production paths: implement fully or stop and say so. Mocks and
  fixtures are allowed only in test files (`*.test.*`, `*.spec.*`, `__tests__/`, `tests/`).
- Testing strategy: Playwright for E2E, Vitest + React Testing Library for unit; coverage
  target 80%+ overall (pages 80, components 75, hooks 90). Prefer integration tests; test
  behavior and error cases, not implementation. Python coverage for crypto-enhanced.
- Platform: Windows 11 only. Shell is PowerShell 7+ (chain with `;`, never `&&`). Backslash
  paths, CRLF line endings. Desktop apps (Tauri/Electron) target Windows 11 exclusively;
  web apps and npm packages may stay platform-agnostic.
- Ports policy: 3000–3099 app servers, 3100–3199 infrastructure, 4200–4299 terminal/PTY,
  5000–5099 backend proxies/bridges, 5173–5199 Vite dev, 8000–8099 camera/media, 18000+
  desktop automation. Command Center dev runs on 5177; Prompt Engineer server on 3085. Check
  the registry before assigning a new port.
- Project discipline: one active project lock at a time (state in
  `D:\active-project\active-project.json`); finish features to 100% (no placeholders/TODOs,
  integrated end-to-end, tests passing) before starting the next. Finisher mode: fix
  crashes and ship, no new features unless asked.
- Version control: GitHub remote `github.com/freshwaterbruce2/vibe-tech-monorepo` (branch
  `main`); merge to main roughly every 10 commits; 10 automated pre-commit checks (file
  size, secret scan, ESLint/TS, Python ruff, PowerShell, Rust fmt, JSON/YAML, conflict
  markers, import depth, trading-system safety). Bypass with `--no-verify` only in
  emergencies.

This is the index; per-type notebooks hold the detailed per-app docs.
