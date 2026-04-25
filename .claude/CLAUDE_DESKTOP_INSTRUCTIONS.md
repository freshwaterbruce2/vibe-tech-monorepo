# Claude Desktop Instructions for C:\dev Monorepo

## 🎯 Primary Context

You are working with a **production monorepo** containing:

- **Live cryptocurrency trading system** (REAL MONEY - handle with extreme care)
- React 19.2 web applications
- Python async trading bot
- Multiple backend services
- Data pipelines

**Operating System**: Windows 11 (PowerShell environment)
**Package Manager**: pnpm (with Nx for monorepo orchestration)
**Current Date**: Always check current date and search for latest information

## 🚨 CRITICAL RULES

### 1. **Trading Bot Safety** ⚠️

The `apps/crypto-enhanced` directory contains a LIVE trading system currently trading XLM/USD with real money.

**BEFORE any changes to trading bot:**

- ✅ Read `TRADING_BOT_GUIDE.md` in this directory
- ✅ Verify you understand the change's impact
- ✅ Check if bot is currently running
- ✅ Test with mocks (never hit real API in tests)
- ✅ Ask user for confirmation if uncertain

**Emergency Stop:**

```powershell
cd C:\dev\apps\crypto-enhanced
.\stop_trading.ps1
```

### 2. **Always Search Current Information**

Your knowledge cutoff is January 2025. Always search when:

- Implementing new features (check latest best practices)
- Working with APIs (Kraken, Supabase, etc.)
- Using frameworks (React 19.2.4, TypeScript 5.9.3, Vite 7.3.1)
- Investigating errors or deprecations

### 3. **Quality First**

NEVER skip quality checks before suggesting commits:

```powershell
# Web app
pnpm run quality  # lint + typecheck + test:unit + build

# Trading bot
cd apps\crypto-enhanced
.venv\Scripts\activate
python run_tests.py
```

## 📁 Project Structure

```
C:\dev\
├── src/                      # Main web app (React 19.2 + TypeScript + Vite)
├── projects/
│   ├── crypto-enhanced/      # ⚠️ LIVE trading bot (Python async)
│   ├── active/              # Active sub-projects
│   │   ├── web-apps/        # Additional web applications
│   │   └── desktop-apps/    # Desktop applications
│   └── shared/              # Shared libraries
├── backend/                 # Node.js Express services
├── data_pipeline/          # Python ETL workflows
├── packages/               # Shared packages
└── .claude/                # This directory - project knowledge
```

## 🔄 Standard Workflow

### For Web App Changes (Root Level)

1. **Analyze**: Understand existing code, check dependencies
2. **Research**: Search latest React 19.2.4/TypeScript 5.9.3 patterns
3. **Implement**: Make changes using current best practices
4. **Test**: Run `pnpm run quality`
5. **Verify**: Check that build succeeds
6. **Document**: Update relevant docs if needed

### For Trading Bot Changes ⚠️

1. **STOP**: Read `TRADING_BOT_GUIDE.md` first
2. **Analyze**: Check bot status, review logs
3. **Research**: Verify Kraken API current documentation
4. **Test First**: Write/update tests with mocks
5. **Implement**: Make changes carefully
6. **Test Again**: Run full test suite
7. **Monitor**: Check logs after deployment

### For Backend/Pipeline Changes

1. **Analyze**: Check service dependencies
2. **Research**: Verify Node.js/Python best practices
3. **Implement**: Use async patterns (Python) or proper Express patterns (Node)
4. **Test**: Run relevant test suite
5. **Verify**: Check service health

## 🛠️ Essential Commands

### Monorepo Management

```powershell
# Install all dependencies
pnpm install

# Check monorepo health
pnpm run monorepo:health

# View dependency graph
pnpm run graph

# Run parallel dev servers
pnpm run parallel:dev
```

### Web App (Root)

```powershell
# Development
pnpm run dev              # Start Vite dev server (port 5173)

# Quality checks
pnpm run lint             # ESLint
pnpm run typecheck        # TypeScript
pnpm run test:unit        # Vitest unit tests
pnpm run quality          # All checks at once

# Build
pnpm nx build <project>   # Project production build
pnpm run build:production # Root Vite production build only
```

### Trading Bot (apps/crypto-enhanced) ⚠️

```powershell
cd apps\crypto-enhanced
.venv\Scripts\activate   # Activate virtual environment

# Check status (safe)
python scripts\check_status.py

# Run tests (ALWAYS before changes)
python run_tests.py

# Human operator only: do not start live trading from an agent workflow
# python start_live_trading.py

# Stop bot
.\stop_trading.ps1

# View logs
Get-Content -Path trading_new.log -Tail 50 -Wait
```

### Backend Services

```powershell
cd backend
pnpm run dev              # Start with hot reload (port 3000)
```

## 📚 Reference Files

Read these files in `.claude/` directory for detailed guidance:

1. **MONOREPO_ARCHITECTURE.md** - Complete architecture overview
2. **TRADING_BOT_GUIDE.md** - ⚠️ Critical trading bot specifics
3. **COMMON_WORKFLOWS.md** - Day-to-day development tasks
4. **QUALITY_STANDARDS.md** - Code standards and best practices
5. **TROUBLESHOOTING_GUIDE.md** - Common issues and solutions

## 🔍 When to Ask vs. Execute

### Execute Automatically

- Code reviews and suggestions
- Documentation updates
- Web app improvements (non-breaking)
- Running quality checks
- Searching for current information
- Reading files and analyzing code

### Ask First

- ANY changes to `apps/crypto-enhanced/` (trading bot)
- Modifying package.json dependencies
- Changing TypeScript/ESLint configurations
- Deleting files or directories
- Running deployment commands
- Modifying environment variables

## 💡 Key Principles

1. **Safety First**: Especially for trading bot
2. **Search First**: Always verify current best practices
3. **Test Always**: No commits without passing tests
4. **Quality Gates**: All checks must pass
5. **Clear Communication**: Explain what you're doing and why
6. **Rollback Ready**: Know how to revert changes

## 🎨 Code Style

### TypeScript (Web App)

- Strict mode enabled (`noImplicitAny`, `strictNullChecks`)
- Use `@/` path aliases for imports
- React 19.2 patterns (ref as prop, useEffectEvent)
- No `any` types - use `unknown` if truly dynamic
- Functional components with hooks

### Python (Trading Bot)

- Fully async architecture (`async`/`await`)
- Type hints on all functions
- Pydantic v2 for validation
- Comprehensive error handling
- TaskGroups for concurrency (Python 3.11+)

### Node.js (Backend)

- ESM modules (`import`/`export`)
- Express middleware patterns
- Async/await error handling
- Input validation

## 🔐 Security

**NEVER commit:**

- `.env` files
- API keys or secrets
- Database credentials
- Trading bot configuration with real keys

**Protected files** (check `.gitignore`):

- `.env*` (all environment files)
- `MY-API-KEYS.txt`
- `**/secrets.*`

## 📊 Monitoring

### Trading Bot Health

```powershell
cd apps\crypto-enhanced

# Quick status
python scripts\check_status.py

# Database check
sqlite3 trading.db "SELECT * FROM trades ORDER BY timestamp DESC LIMIT 5;"

# Recent errors
Get-Content trading_new.log | Select-String "ERROR|CRITICAL" | Select-Object -Last 20
```

### Web App Health

```powershell
# Check for vulnerabilities
pnpm audit

# Check bundle size
pnpm run analyze

# Run all tests
pnpm run test:all
```

## 🎯 Success Criteria

Before suggesting a commit, verify:

- ✅ All quality checks pass (`pnpm run quality`)
- ✅ Tests pass and cover changes
- ✅ Code follows style guide
- ✅ Documentation updated if needed
- ✅ No security vulnerabilities introduced
- ✅ Trading bot (if touched): Extensively tested with mocks

## 📞 Getting Help

If uncertain about:

- **Trading bot changes**: ALWAYS ask first
- **Breaking changes**: Discuss impact
- **Architecture decisions**: Explain options
- **Security implications**: Highlight risks

---

**Remember**: This is a production system with real money at stake. When in doubt, ask. Better to be cautious than to cause financial loss or system downtime.
