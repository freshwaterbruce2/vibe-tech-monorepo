# Nx Optimization & Caching (2026)

Last Updated: 2026-01-07
Version: Nx 21.6.3
Scope: VibeTech Monorepo (52+ projects)

## Overview

Nx provides intelligent build caching, affected-only builds, and parallel execution for the VibeTech monorepo.

**Performance Impact:**

- Local caching: 80-90% faster repeated builds
- Typecheck: 854ms → 160ms (81% faster with cache)
- CI Pipeline: ~15-20min → ~3-5min (75% faster)
- Deployments: ~25min → ~5-8min (70% faster)

## Core Concepts

### 1. Computation Caching

Nx caches task outputs based on inputs:

- Source files
- Dependencies
- Configuration
- Environment variables

**Result**: If inputs unchanged, output restored from cache

### 2. Affected Detection

Only run tasks for changed projects:

```bash
# Traditional (wastes time)
pnpm run-many -t build  # Builds ALL 52 projects

# Nx optimized (intelligent)
pnpm nx affected:build  # Only builds changed projects
```

### 3. Parallel Execution

Tasks run concurrently when possible:

```bash
pnpm nx run-many -t lint,test,build --parallel=3
```

## Essential Commands

### Run Tasks

```bash
# Single project
pnpm nx run my-app:build
pnpm nx run my-app:test

# Multiple projects
pnpm nx run-many -t build --projects=app1,app2

# All projects
pnpm nx run-many -t lint,test,build

# Affected only (most efficient)
pnpm nx affected:lint
pnpm nx affected:test
pnpm nx affected:build
```

### Workspace Information

```bash
# Visualize project graph
pnpm nx graph

# Show projects by tag
pnpm nx show projects --projects=tag:web
pnpm nx show projects --projects=tag:database

# Project details
pnpm nx show project my-app --web
```

### Cache Management

```bash
# View cache statistics
pnpm nx show project my-app

# Clear cache (rare - only if corruption)
pnpm nx reset
```

## Project Structure Integration

### Nx Integration Status (2026-01-01)

- **Apps**: 23/24 (95.8%) - only `_archived` excluded
- **Backend**: 11/11 (100%)
- **Packages**: 18/18 (100%)
- **Total**: 52/53 projects with full Nx caching (98.1%)

### Project Tags

Use tags for filtering:

```json
// project.json
{
  "tags": ["web", "react", "database", "filesystem"]
}
```

Query by tags:

```bash
pnpm nx run-many -t test --projects=tag:web
pnpm nx run-many -t build --projects=tag:database
```

## Nx Cloud Integration

### Self-Healing CI

- Automatically detects CI failures
- Analyzes workspace structure
- Proposes intelligent fixes
- Classification customization available

### Classification Overrides

```yaml
# Environment issues (manual config needed)
- Missing environment variables (API_KEY, DATABASE_URL)
- Missing Python dependencies in requirements.txt
- Port conflicts (EADDRINUSE)
- Out of memory errors

# Code changes (automated fixes possible)
- TypeScript errors in application code
- Linting failures (auto-fix with --fix)
- Format issues (auto-fix with format:write)
```

### Predefined Fixes

```bash
# Linting failures
pnpm nx run myapp:lint --fix

# Format failures
pnpm nx format:write --projects=myapp

# TypeScript build order
# Update project.json → implicitDependencies

# Nx cache corruption
pnpm nx reset && retry
```

## CI/CD Optimization

### GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for affected detection
      
      - name: Run affected builds
        run: pnpm nx affected:build
      
      - name: Run affected tests
        run: pnpm nx affected:test
```

### Smart Change Detection

Use `dorny/paths-filter` to detect changed projects:

- Skip unnecessary jobs (saves ~80% CI time)
- Only deploy affected applications
- Parallel execution where possible

## Best Practices

### 1. Always Use Nx Commands

```bash
# ✅ Correct - uses Nx caching
pnpm nx run my-app:build
pnpm nx affected:test

# ❌ Avoid - bypasses Nx
cd apps/my-app && npm run build
```

### 2. Leverage Affected Builds

```bash
# Daily development
pnpm nx affected:lint
pnpm nx affected:test
pnpm nx affected:build

# Pre-commit
pnpm nx affected --target=lint,test,build
```

### 3. Use Parallel Execution

```bash
# Parallel tasks (faster)
pnpm nx run-many -t lint,test,typecheck --parallel=3

# Sequential (slower, only when needed)
pnpm nx run-many -t lint,test,typecheck
```

### 4. Tag Projects Appropriately

```json
{
  "tags": [
    "web",           // Frontend applications
    "api",           // Backend services
    "database",      // Database interactions
    "filesystem",    // File system operations
    "learning-system" // AI learning data
  ]
}
```

### 5. Incremental Merges (Git)

Merge every 10 commits to keep affected detection accurate:

```bash
git commits-ahead  # Check commit count
# When ≥10: merge to main
```

## Troubleshooting

### Issue: Cache Not Working

**Solution**:

```bash
# Check cache statistics
pnpm nx show project my-app

# Clear and rebuild cache
pnpm nx reset
pnpm nx run my-app:build
```

### Issue: "All projects affected"

**Solution**:

```bash
# Ensure proper git history
git fetch origin main:main --force

# Check base SHA
pnpm nx affected:apps --base=main
```

### Issue: Task Always Runs (No Cache)

**Check**:

1. Are inputs defined in project.json?
2. Are files excluded from .gitignore in inputs?
3. Is output directory correct?

## Performance Monitoring

### Check Build Times

```bash
# Before optimization
time pnpm run build:all  # 15-20 minutes

# After Nx caching
time pnpm nx run-many -t build  # 3-5 minutes (with cache)
```

### Cache Hit Rate

Monitor cache effectiveness:

- 80-90% hit rate: Excellent
- 50-79% hit rate: Good
- <50% hit rate: Investigate inputs/outputs

## Configuration Files

### nx.json (Workspace)

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nx/js",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "typecheck"]
      }
    }
  }
}
```

### project.json (Per Project)

```json
{
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "outputs": ["{projectRoot}/dist"],
      "inputs": ["production", "^production"]
    }
  }
}
```

## Reference

- Nx Docs: <https://nx.dev/>
- Workspace config: C:\\dev\\nx.json
- CI/CD guide: .claude/rules/ci-cd-nx.md
- Git workflow: .claude/rules/git-workflow-incremental-merge.md
