---
allowed-tools: Bash(find:*), Bash(ls:*), Read
description: List all available slash commands with descriptions
---

# Available Slash Commands

All custom slash commands for the C:\dev monorepo.

## Core Workflow

| Command | Description |
|---------|-------------|
| `/explore <problem>` | Read-only codebase diagnosis + plan before any implementation |
| `/fix-bug <github-issue-url>` | Automated GitHub issue → branch → fix → PR workflow |
| `/fix-lint <file-or-project>` | Fix lint/TS errors with strict read-after-edit discipline |
| `/auto_fix_cycle [dir]` | Iterative TypeScript/ESLint auto-fix loop |
| `/scaffold <name>` | Scaffold a new package in the monorepo |

## Web Development

| Command | Description |
|---------|-------------|
| `/web:quality-check [fix]` | Full pipeline: lint + typecheck + build |
| `/web:component-create <name> [category]` | Generate React component with TypeScript + shadcn/ui |
| `/web:restart-server` | Restart a selected workspace web dev server |
| `/web:test-all` | Run all test suites |

## Nx Monorepo

| Command | Description |
|---------|-------------|
| `/nx:affected [task]` | Run tasks only on affected projects (faster CI) |
| `/nx:cache-clear [deep]` | Clear Nx cache |
| `/nx:cloud-status` | Monitor Nx Cloud integration |
| `/nx:graph` | Visualize project dependency graph |
| `/nx:project-info <name>` | Deep dive into a specific project |
| `/nx:run-many <task>` | Run a task across multiple projects |
| `/nx:workspace-health` | Comprehensive workspace health check |
| `/monorepo-check` | Smart high-performance monorepo checks |

## Crypto Trading

| Command | Description |
|---------|-------------|
| `/crypto:status` | Comprehensive trading system status |
| `/crypto:position-check` | Analyze positions with risk metrics |
| `/crypto:trading-status` | Check positions, orders, and health |
| `/crypto:restart` | Safely restart the trading system |

## Development Utilities

| Command | Description |
|---------|-------------|
| `/dev:cleanup [quick\|deep]` | Clean temporary files and caches |
| `/dev:doctor` | Comprehensive system health check |
| `/dev:parallel-dev [web\|crypto\|both]` | Start development servers in parallel |
| `/dev:port-check <port>` | Identify process on port |
| `/dev:yolo-mode <task>` | Autonomous task execution (feature branches only) |

## Git

| Command | Description |
|---------|-------------|
| `/git:smart-commit` | AI-generated commit with analysis |

## Project Management

| Command | Description |
|---------|-------------|
| `/project:status` | Health check across all projects |
| `/project:switch <name>` | Quick context switch between projects |

## Planning & Loops

| Command | Description |
|---------|-------------|
| `/planning-with-files:start` | Start a planning session |
| `/planning-with-files:update` | Add entry to current plan |
| `/planning-with-files:status` | Check planning status |
| `/planning-with-files:complete` | Mark planning session done |
| `/planning-with-files:recover` | Restore context from plan file |
| `/planning-with-files:report` | Generate effectiveness report |
| `/loop:cleanup-hygiene` | Autonomous cleanup loop |
| `/loop:prepare` | Pre-loop safety setup |
| `/loop:quality-sweep` | Autonomous lint/typecheck fix loop |
| `/loop:review-optimize` | Read-only code review loop |

## MCP & API

| Command | Description |
|---------|-------------|
| `/mcp:debug` | Diagnose MCP server issues |
| `/agent:run <agent>` | Run an Agent SDK agent |
| `/api:batch-review` | Submit changed code files for batch review |

## Project-Specific Skills

| Command | Description |
|---------|-------------|
| `/nova-agent` | Nova Agent Tauri desktop app context |
| `/nova-mobile-app` | Nova mobile app (React Native) context |
| `/vibe-code-studio` | Vibe Code Studio Electron app context |
| `/vibe-justice` | Vibe Justice web app context |
| `/vibe-shop:dev` | Start Vibe-Shop dev server |
| `/vibe-shop:build` | Production build for Vibe-Shop |
| `/vibe-shop:quality` | Quality pipeline for Vibe-Shop |
| `/invoice-automation-saas` | Invoice SaaS (Next.js + Stripe) context |
| `/desktop:cleanup` | Desktop app cleanup |
| `/desktop:quality-check` | Desktop app quality check |
| `/desktop:test-smart` | Smart test runner for desktop apps |

## Category Skills

| Command | Description |
|---------|-------------|
| `/categories:database` | SQLite/PostgreSQL/Prisma patterns |
| `/categories:desktop` | Tauri/Electron desktop dev patterns |
| `/categories:learning-system` | AI learning & memory system patterns |
| `/categories:mobile` | Capacitor/React Native patterns |
| `/categories:monorepo` | Monorepo-wide operation patterns |
| `/categories:pwa` | Progressive Web App patterns |
| `/categories:webapp` | React/Next.js web app patterns |

## Usage Examples

```bash
# Diagnose before implementing (always do this first)
/explore why does nova-agent RAG return stale results

# Fix a GitHub issue end-to-end
/fix-bug https://github.com/freshwaterbruce2/vibe-tech-monorepo/issues/123

# Fix lint errors in a specific project
/fix-lint vibe-tutor

# Run quality checks with auto-fix
/web:quality-check fix

# Build only affected projects
/nx:affected build

# Check trading system
/crypto:status

# Start dev servers
/dev:parallel-dev both
```

$ARGUMENTS
