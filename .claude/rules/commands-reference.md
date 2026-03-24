# Commands Reference

Quick reference for common development commands across the VibeTech monorepo.

## D:\ Version Control (Local Snapshots)

**Location:** `C:\dev\scripts\version-control\`
**Documentation:** `.claude/rules/d-drive-version-control.md`

```powershell
# Interactive menu (recommended)
cd C:\dev\scripts\version-control
.\QUICK_START.ps1

# Create snapshot (like git commit)
.\Save-Snapshot.ps1 -Description "Before database migration"
.\Save-Snapshot.ps1 -Description "Production ready" -Tag "v1.0.0"

# List snapshots (like git log)
.\List-Snapshots.ps1
.\List-Snapshots.ps1 -Limit 10

# Restore snapshot (like git checkout)
.\Restore-Snapshot.ps1 -SnapshotId "20260116-143000"
.\Restore-Snapshot.ps1 -Tag "v1.0.0"

# Repository status
cd C:\dev\scripts\version-control
.\Repository-Status.ps1
```

**When to Use:**

- Before database migrations
- Before major refactoring
- Before testing risky changes
- Before destructive operations
- Daily backups (automated)

**Repository:** `D:\repositories\vibetech\`
**Compression:** 97% smaller (2 GB → 64 MB)

---

## Port Manager

**Location:** `C:\dev\tools\port-manager\`
**Documentation:** `C:\dev\tools\port-manager\README.md`

```powershell
# Check if port is in use
C:\dev\tools\port-manager\port.ps1 check 8091

# Kill process on specific port
C:\dev\tools\port-manager\port.ps1 kill 8091

# List all registered ports and their status
C:\dev\tools\port-manager\port.ps1 list

# Kill all Vite dev servers
C:\dev\tools\port-manager\port.ps1 clear vite

# Find a free port in range
C:\dev\tools\port-manager\port.ps1 find 3000 3099
```

**Add to PowerShell profile for global access:**

```powershell
# Add this line to $PROFILE:
function port { & 'C:\dev\tools\port-manager\port.ps1' @args }
```

**Port Ranges:**

- `3000-3099` - Backend API servers
- `3100-3199` - MCP servers
- `5173-5199` - Vite dev servers
- `8000-8999` - Specialized services

---

## Web Application (Root Directory)

**Package Manager:** pnpm 9.15.0

```bash
# Development
pnpm run dev                # Start dev server (port 5173)
pnpm run build              # Production build
pnpm run preview            # Preview production build

# Quality Checks (run before commits)
pnpm run quality            # Full pipeline: lint + typecheck + build (Nx-powered)
pnpm run quality:fix        # Auto-fix lint issues + typecheck
pnpm run quality:affected   # Only run checks on changed projects
pnpm run lint               # ESLint check only
pnpm run typecheck          # TypeScript compilation check

# Nx Monorepo Commands (with intelligent caching)
pnpm run build:all          # Build all projects with caching
pnpm run lint:all           # Lint all projects
pnpm run test:all           # Test all projects
pnpm nx graph               # Visualize project dependencies

# Testing
pnpm run test               # Run Playwright tests
pnpm run test:ui            # Playwright UI mode
pnpm run test:unit          # Run unit tests
pnpm run test:unit:coverage # Run with coverage report

# Package Management
pnpm install                # Install all workspace dependencies
pnpm add <package>          # Add dependency to root workspace
pnpm add <package> --filter <project>  # Add to specific project
```

## Backend Services

### Root-Level Backends

```bash
# Vibe-Tech Backend (backend/)
pnpm nx dev vibe-tech-backend        # Start with nodemon (port 3000)
pnpm nx start vibe-tech-backend      # Production start
pnpm nx health vibe-tech-backend     # Health check

# OpenRouter Proxy (backend/openrouter-proxy/)
cd backend/openrouter-proxy
pnpm dev                             # Development (port 3001)
pnpm start                           # Production
pm2 start ecosystem.config.cjs       # PM2 deployment
pm2 logs openrouter-proxy            # View logs

# Run via workspace
pnpm --filter vibe-tech-backend dev
pnpm --filter openrouter-proxy dev
```

### App-Specific Backends

```bash
# Vibe-Tutor Backend (apps/vibe-tutor/render-backend/)
cd apps/vibe-tutor/render-backend
node server.mjs                      # Start server (port 3001)

# Vibe-Justice Backend (apps/vibe-justice/backend/)
cd apps/vibe-justice/backend
.venv\Scripts\activate               # Activate Python venv
uvicorn main:app --reload --port 8000  # Start FastAPI
.venv\Scripts\python.exe -m pytest vibe_justice/tests/ -v  # Run tests

# IconForge Server (apps/iconforge/server/)
pnpm nx dev iconforge-backend        # Development (port 3002)
```

**See**: `docs/BACKEND_SERVICES.md` for complete backend documentation

## Vibe-Tutor Mobile App

```bash
# Web development
pnpm nx dev vibe-tutor               # Vite dev server
pnpm nx build vibe-tutor             # Production build

# Android development
pnpm nx android:sync vibe-tutor      # Sync web assets
pnpm nx android:build vibe-tutor     # Build APK
pnpm nx android:deploy vibe-tutor    # Full build + install

# Direct commands (alternative)
pnpm --filter vibe-tutor android:full-build
```

## Custom Slash Commands

The monorepo includes custom automation commands in `.claude/commands/` for frequent tasks:

### Web Development Commands

- **`/web:restart-server`** - Restart digital-content-builder dev server with health checks
- **`/web:test-all`** - Run all PowerShell test suites with consolidated reporting
- **`/web:quality-check [fix]`** - Complete quality pipeline (lint + typecheck + build)
- **`/web:component-create <name> [type]`** - Generate new React component with TypeScript

### Crypto Trading Commands

- **`/crypto:status`** - Comprehensive trading system health check (database + logs + processes)
- **`/crypto:trading-status`** - Quick check of positions, orders, and system health
- **`/crypto:position-check`** - Analyze current positions with risk metrics

### Development Utilities

- **`/dev:port-check <port>`** - Check if port is in use and identify process
- **`/dev:parallel-dev [web|crypto|both]`** - Start dev servers in parallel
- **`/dev:cleanup [quick|deep|analyze]`** - Smart cleanup of temp files and caches

### Git & Quality Commands

- **`/git:smart-commit [message]`** - AI-powered conventional commit message generator (uses Opus model)
- **`/mcp:debug`** - Diagnose MCP server issues with config, logs, and process checks
- **`/list-commands`** - Show all available custom commands with descriptions

**Usage Tips:**

- Commands support arguments: `/dev:port-check 5173`
- Some commands auto-fix issues: `/web:quality-check fix`
- Interactive commands wait for approval: `/git:smart-commit`
- View command source: `.claude/commands/<category>/<name>.md`

---

## Agent Evaluation Testing

**Location:** `C:\dev\tests\agent-evaluation\`
**Documentation:** `.claude/rules/*-evaluation-summary.md`

### Web Search Grounding Tests

**Documentation:** `.claude/rules/web-search-grounding-*.md`

```powershell
# Run all web search grounding tests (80 tests)
cd C:\dev\tests\agent-evaluation
.\run-web-search-grounding-tests.ps1 -TestCategory "all"

# Run specific category
.\run-web-search-grounding-tests.ps1 -TestCategory "post-cutoff"
.\run-web-search-grounding-tests.ps1 -TestCategory "versions"
.\run-web-search-grounding-tests.ps1 -TestCategory "apis"
.\run-web-search-grounding-tests.ps1 -TestCategory "best-practices"
.\run-web-search-grounding-tests.ps1 -TestCategory "adversarial"

# Run single test by ID
.\run-web-search-grounding-tests.ps1 -TestId "TEST-001"
.\run-web-search-grounding-tests.ps1 -TestId "ADV-025"

# Output formats
.\run-web-search-grounding-tests.ps1 -TestCategory "all" -OutputFormat "json"
.\run-web-search-grounding-tests.ps1 -TestCategory "all" -OutputFormat "markdown"
```

**Test Categories:**

- **post-cutoff** - Tests for post-January 2026 information queries
- **versions** - Package/library version queries
- **apis** - API documentation and usage queries
- **best-practices** - Current best practices and recommendations
- **edge-cases** - Fundamental concepts, compatibility checks
- **adversarial** - Attack scenarios (ambiguity, hallucination, source manipulation)

**Target Compliance:**

- Standard Tests: ≥ 95% (48/50 passing)
- Adversarial Resistance: ≥ 90% (27/30 passing)
- Hallucination Rate: 0%

### No Duplicates Rule Tests

**Documentation:** `.claude/rules/no-duplicates-*.md`

```powershell
# Run all no duplicates tests (80 tests)
cd C:\dev\tests\agent-evaluation
.\run-no-duplicates-tests.ps1 -TestCategory "all"

# Run specific category
.\run-no-duplicates-tests.ps1 -TestCategory "file-creation"
.\run-no-duplicates-tests.ps1 -TestCategory "features"
.\run-no-duplicates-tests.ps1 -TestCategory "components"
.\run-no-duplicates-tests.ps1 -TestCategory "services"
.\run-no-duplicates-tests.ps1 -TestCategory "communication"
.\run-no-duplicates-tests.ps1 -TestCategory "adversarial"

# Run single test by ID
.\run-no-duplicates-tests.ps1 -TestId "TEST-ND-001"
.\run-no-duplicates-tests.ps1 -TestId "ADV-ND-009"

# Output formats
.\run-no-duplicates-tests.ps1 -TestCategory "all" -OutputFormat "json"
.\run-no-duplicates-tests.ps1 -TestCategory "all" -OutputFormat "markdown"
```

**Test Categories:**

- **file-creation** - Tests for creating new files (must search first)
- **features** - Feature implementation (must check for duplicates)
- **components** - React component creation workflow
- **services** - Service/handler creation patterns
- **communication** - User consultation and documentation
- **adversarial** - Attack scenarios (pressure, naming tricks, scope creep)

**Target Compliance:**

- Search Compliance: 100% (must search before every creation)
- Duplicate Detection: ≥ 90%
- User Consultation: ≥ 95% when unclear
- Adversarial Resistance: ≥ 90%

**See:**

- `.claude/rules/web-search-grounding-evaluation-summary.md`
- `.claude/rules/no-duplicates-evaluation-summary.md`

---

## Database Operations

```bash
# Unified database (D:\databases\database.db)
Test-DatabaseConnections   # PowerShell command
```

## Cleanup & Maintenance

```bash
# Quick cleanup (weekly)
.\tools\cleanup-scripts\Quick-Cleanup-Execute.ps1 -DryRun 0

# Deep cleanup (monthly)
.\tools\cleanup-scripts\Execute-Deep-Cleanup.ps1 -RemoveNodeModules 1
```

## Current State Tracking

Check these locations for system state:

- **Git Status**: Modified files indicate active work areas
- **Trading Logs**: `D:\logs\trading.log` and `trading_new.log`
- **Session Status**: `apps/crypto-enhanced/SESSION_STATUS.md`
- **Database State**: `trading.db` for orders/positions
