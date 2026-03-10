# Vibe Code Studio - Windows 11 Quick Start Guide

## ✅ Current Status

**Build Status:** ✅ Successfully builds on Windows 11
**Last Tested:** October 25, 2025
**Build Time:** ~1 minute 35 seconds

---

## 🚀 Getting Started

### Prerequisites

- Windows 11
- Node.js 20+ installed
- pnpm installed (via Corepack or `npm install -g pnpm`)
- Git installed
- PowerShell 7+ recommended

---

## 📝 PowerShell Helper Scripts

I've created 4 PowerShell scripts to make your life easier:

### `./dev.ps1` - Start Development Server

```powershell
# Start the app in development mode with hot reload
.\dev.ps1
```

**What it does:**

- Checks if dependencies are installed
- Starts Electron app with hot reload
- Opens on <http://localhost:5174>

---

### `./build.ps1` - Build the Application

```powershell
# Build for production
.\build.ps1

# Build and create installer
.\build.ps1 -Package
```

**What it does:**

- Runs TypeScript check
- Builds production bundles
- Optionally creates Windows installer

**Output:**

- `out/` - Electron main/preload
- `dist/` - Web UI bundle
- `release/` - Installer (if -Package used)

---

### `./test.ps1` - Run Tests

```powershell
# Run unit tests only
.\test.ps1

# Run with coverage report
.\test.ps1 -Coverage

# Run unit + E2E tests
.\test.ps1 -E2E
```

**What it does:**

- Runs Vitest unit tests
- Optionally generates coverage report
- Optionally runs Playwright E2E tests

**Current Test Status:**

- Unit Tests: 82% pass rate (1697/2070)
- E2E Tests: Not yet working (WIP)

---

### `./quality.ps1` - Full Quality Check

```powershell
# Run all quality checks
.\quality.ps1

# Run quality checks and auto-fix linting
.\quality.ps1 -Fix
```

**What it does:**

- TypeScript compilation check
- ESLint linting
- Unit test execution
- Summary report

---

### `./clean.ps1` - Clean Build Artifacts

```powershell
# Remove build artifacts and caches
.\clean.ps1

# Deep clean (also clears pnpm cache and reinstalls)
.\clean.ps1 -Deep
```

**What it does:**

- Removes: node_modules, dist, out, .vite, coverage, test-results
- Deep mode: Clears pnpm cache and reinstalls deps

---

## 🎯 Daily Workflow

### Morning Routine

```powershell
# Pull latest changes
git pull

# Install any new dependencies
pnpm install

# Run quality checks
.\quality.ps1

# Start development
.\dev.ps1
```

### Before Committing

```powershell
# Run quality checks
.\quality.ps1 -Fix

# Stage and commit (pre-commit hooks will run automatically)
git add .
git commit -m "feat: your feature description"
```

**Pre-commit hooks automatically run:**

- TypeScript check
- ESLint with auto-fix
- Prettier formatting

### Building for Distribution

```powershell
# Full quality check
.\quality.ps1

# Build and package
.\build.ps1 -Package

# Test the installer
.\release\Vibe-Code-Studio-Setup-1.0.0.exe
```

---

## 📂 Project Structure

```
C:\dev\apps\vibe-code-studio\
├── electron/           # Electron main process
│   ├── main.ts        # App entry point
│   └── preload.ts     # Preload script
├── src/               # React UI source
│   ├── components/    # UI components
│   ├── services/      # Business logic
│   ├── hooks/         # React hooks
│   └── main.tsx       # React entry
├── tests/             # E2E tests
│   └── basic.spec.ts  # Basic functionality tests
├── dist/              # Built web UI (after build)
├── out/               # Built Electron code (after build)
├── release/           # Installers (after package)
├── dev.ps1            # Development server
├── build.ps1          # Build script
├── test.ps1           # Test runner
├── quality.ps1        # Quality checks
└── clean.ps1          # Cleanup script
```

---

## 🛠️ Common Tasks

### Install Dependencies

```powershell
pnpm install
```

### Start Development Server

```powershell
.\dev.ps1
# OR (preferred from repo root)
pnpm nx run vibe-code-studio:dev
```

### Build for Production

```powershell
.\build.ps1
# OR
pnpm nx run vibe-code-studio:build
```

### Run Tests

```powershell
.\test.ps1
# OR
pnpm nx run vibe-code-studio:test
```

### Type Check

```powershell
pnpm nx run vibe-code-studio:typecheck
```

### Lint Code

```powershell
pnpm nx run vibe-code-studio:lint
# OR
pnpm --filter vibe-code-studio run lint:fix  # Auto-fix issues
```

### Versioning Policy

Normal build/package commands do **not** bump app version:

```powershell
pnpm nx run vibe-code-studio:package
pnpm nx run vibe-code-studio:electron-build
pnpm nx run vibe-code-studio:electron-build-win
```

Use explicit release/version commands when you want a version bump:

```powershell
pnpm --filter vibe-code-studio run version:patch
pnpm --filter vibe-code-studio run release:build
pnpm --filter vibe-code-studio run release:build:win
```

---

## 🐛 Troubleshooting

### "better-sqlite3.node not found"

**Problem:** Database initialization fails
**Solution:** Rebuild native modules

```powershell
pnpm nx run vibe-code-studio:rebuild-deps
```

### "Port 5174 already in use"

**Problem:** Dev server can't start
**Solution:** Kill the process

```powershell
# Find process on port 5174
Get-Process -Id (Get-NetTCPConnection -LocalPort 5174).OwningProcess

# Kill it
Stop-Process -Id <PID> -Force
```

### "Module not found" errors

**Problem:** Dependencies not installed
**Solution:** Clean install

```powershell
.\clean.ps1 -Deep
```

### Tests failing

**Problem:** Stale test cache
**Solution:** Clear test artifacts

```powershell
Remove-Item -Recurse -Force coverage, test-results, playwright-report
pnpm nx run vibe-code-studio:test
```

---

## 🔧 Configuration Files

- `vite.config.ts` - Vite configuration (dev server, build)
- `electron.vite.config.ts` - Electron-specific Vite config
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint rules
- `playwright.config.ts` - E2E test configuration
- `vitest.config.ts` - Unit test configuration

---

## 📊 Current Known Issues

### High Priority

1. **E2E Tests Not Working** - Playwright tests timeout (database initialization issue)
2. **AutoFixService** - 16/20 tests failing (matchAll bug)
3. **DatabaseService** - 60+ tests failing (integration tests)

### Medium Priority

1. **75 Stale Documentation Files** - Need cleanup
2. **Bundle Size** - Monaco + main.js = 3.5 MB (could optimize)

### Low Priority

1. **Type Coverage** - Not measured yet
2. **Visual Regression Tests** - Not set up

---

## 🎓 Learning Resources

### Internal Documentation

- `CLAUDE.md` - Development guidelines
- `PROJECT_STATUS.md` - Current project state
- `ROADMAP.md` - Feature roadmap
- `D:/learning/` - Learning system (failure analysis, workflows)

### Key Files to Understand

1. **`src/App.tsx`** - Main application orchestrator
2. **`src/components/Editor.tsx`** - Monaco editor wrapper
3. **`src/services/UnifiedAIService.ts`** - AI provider abstraction
4. **`electron/main.ts`** - Electron app lifecycle

---

## ✅ Next Steps

1. ✅ **Build verification** - App builds successfully
2. ✅ **PowerShell scripts** - Helper scripts created
3. ⏳ **Manual testing** - Test all 7 integrated features
4. ⏳ **Fix failing tests** - AutoFixService, DatabaseService
5. ⏳ **Documentation cleanup** - Remove 75 stale files

---

## 💡 Tips

### Windows Terminal Setup

Add these aliases to your PowerShell profile:

```powershell
# Edit profile
notepad $PROFILE

# Add these lines:
Set-Location C:\dev\apps\vibe-code-studio
function dev { .\dev.ps1 }
function build { .\build.ps1 }
function test { .\test.ps1 }
function quality { .\quality.ps1 }
function clean { .\clean.ps1 }
```

Now you can just type `dev`, `build`, `test`, etc.

### Git Workflow

```powershell
# Daily workflow
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: my feature"  # Pre-commit hooks run automatically
git push
```

### Debugging

```powershell
# Enable Electron DevTools
$env:ELECTRON_ENABLE_LOGGING=1
.\dev.ps1

# Enable verbose logging
$env:DEBUG="*"
.\dev.ps1
```

---

**Last Updated:** October 25, 2025
**For Support:** Check D:/learning/ for workflow improvements and failure analysis
