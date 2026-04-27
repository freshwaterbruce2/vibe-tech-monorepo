# VibeTech Monorepo

Multi-project monorepo spanning desktop, web, mobile, and infrastructure applications with shared packages.

## Prerequisites

- **Node.js** 22+
- **pnpm** 10.33+ (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **Windows 11** (primary development platform)
- **Rust toolchain** (MSVC) -- required for Tauri apps (nova-agent, vtde)
- **Python 3.11+** -- required for crypto-enhanced only
- **Visual Studio Build Tools 2022** -- native module compilation

## Quick Start

```bash
git clone https://github.com/freshwaterbruce2/vibe-tech-monorepo.git vibetech
cd vibetech
pnpm install
pnpm nx dev <project-name>   # e.g. pnpm nx dev nova-agent
```

## Applications

### Desktop

| App | Description | Tech | Status |
|-----|-------------|------|--------|
| nova-agent | AI desktop assistant with RAG pipeline | Tauri, React, Rust, LanceDB | Active |
| vtde | VibeTech Desktop Environment | Tauri, React | Active |
| vibe-code-studio | AI-powered code editor | Electron, Tauri, React | Maintained |
| gravity-claw | AI agent orchestrator with tool routing and chat bridges | Electron, React, Hono | Maintained |
| clawdbot-desktop | Desktop automation bot | Electron | Experimental |

### Web

| App | Description | Tech | Status |
|-----|-------------|------|--------|
| trendmart (`apps/vibe-shop`) | E-commerce platform | Next.js, Prisma | Active |
| vibe-justice | Legal AI platform | React, Python FastAPI | Maintained |
| business-booking-platform | Hotel booking with AI search | React, Vite | Maintained |
| invoice-automation-saas | SaaS invoice automation | React, Vite | Maintained |
| vibe-tech-lovable | Landing page / marketing site | React, Vite | Maintained |
| chessmaster-academy | Chess lessons, puzzles, and AI tutor | React, Vite, Capacitor | Active |
| VibeBlox | Token incentive system for kids | React, Hono | Experimental |
| prompt-engineer | Prompt testing workbench | React, Vite | Experimental |

### Mobile

| App | Description | Tech | Status |
|-----|-------------|------|--------|
| vibe-tutor | Learning app for kids | Capacitor, React | Active |
| shipping-pwa | Shipping tracker PWA | Capacitor, React | Maintained |
| nova-mobile-app | Nova Agent mobile companion | React Native | Experimental |

### MCP Servers

| App | Description | Status |
|-----|-------------|--------|
| memory-mcp | Exposes memory system to Claude Code | Active |
| mcp-skills-server | Agent skills system for any LLM | Active |
| mcp-gateway | Bridges OpenClaw to MCP servers via IPC | Active |
| mcp-rag-server | Nova-Agent RAG pipeline for Claude | Active |
| desktop-commander-v3 | Unrestricted terminal access for AI agents | Active |
| workspace-mcp-server | Workspace metadata and env MCP server | Active |

### Infrastructure

| App | Description | Status |
|-----|-------------|--------|
| agent-engine | Autonomous coding engine with gated self-improvement | Active |
| crypto-enhanced | Crypto trading system (Python) | Active |
| ai-youtube-pipeline | YouTube content pipeline | Experimental |
| symptom-tracker-api | Health symptom tracker API | Experimental |
| vibe-tech-backend | Shared backend server with local SQLite database | Maintained |

## Shared Packages (25 total)

Key packages by dependents. Full list in `packages/`.

| Package | Purpose | Dependents |
|---------|---------|------------|
| vibetech-shared | Core shared utilities and types | 15 |
| shared-utils | Helper functions and common logic | 7 |
| shared-ipc | Inter-process communication protocol | 6 |
| logger | Structured logging | 6 |
| ui | Shared React component library (shadcn/ui) | 6 |
| openrouter-client | OpenRouter API client | 4 |
| shared-config | Shared ESLint, TS, Vite configs | 3 |
| memory | Unified memory system (semantic, episodic, RAG) | 2 |
| feature-flags | Self-hosted feature flag service | 1 |
| nova-core | Nova Agent intelligence layer | -- |
| mcp-core | MCP protocol utilities | 1 |
| testing-utils | Test helpers and fixtures | 1 |

## Common Commands

### Per-project (preferred)

```bash
pnpm nx dev <project>        # Start dev server
pnpm nx build <project>      # Production build
pnpm nx test <project>       # Run tests
pnpm nx lint <project>       # Lint
```

### Monorepo-wide

```bash
pnpm run quality             # Lint + typecheck + build (all projects)
pnpm run quality:affected    # Same, but only changed projects (faster)
pnpm run lint                # ESLint across all projects
pnpm run typecheck           # TypeScript check across all projects
pnpm run test                # Run all tests
pnpm run test:unit           # Vitest unit tests
pnpm run test:e2e            # Playwright E2E tests
pnpm nx graph                # Visualize project dependency graph
```

### Adding dependencies

```bash
pnpm add <pkg> --filter <project>      # Add to a specific project
pnpm add -D <pkg> --filter <project>   # Add as devDependency
```

Never run bare `pnpm install` from inside a project directory. Always use `--filter` from the workspace root.

## Architecture

Source code lives on `C:\dev`. All runtime data (databases, logs, learning system) lives on `D:\`. See `AI.md` and `docs/WORKSPACE_STRUCTURE.md` for the workspace policy.

```
C:\dev\              source code (git-tracked)
D:\databases\        SQLite databases
D:\logs\             application logs
D:\data\             datasets
D:\learning-system\  AI learning data
```

## CI/CD

GitHub Actions runs on every push and PR. The pipeline uses Nx affected commands to only lint, typecheck, test, and build what changed. Pre-commit hooks enforce file size limits, secret scanning, and formatting locally.

## Further Reading

- `AI.md` -- workspace rules for AI agents
- `docs/PORTS.md` -- port registry
- `docs/WORKSPACE_STRUCTURE.md` -- detailed project structure
- `.claude/rules/` -- development policies (git workflow, testing, TypeScript patterns)

## License

ISC
