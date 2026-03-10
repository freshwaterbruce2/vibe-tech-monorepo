# Git Workflow & Pre-commit Hooks

Git workflow, pre-commit quality gates, and trading system safety checks.

## Incremental Merge Strategy

**See [MONOREPO_WORKFLOW.md](../MONOREPO_WORKFLOW.md) for complete documentation**

### Quick Reference

```bash
# Check commits ahead of main
git commits-ahead

# When you hit 10 commits, merge to main:
git checkout main && git pull
git merge feature/your-branch --no-ff
git push origin main

# Continue working
git checkout feature/your-branch
```

**Why This Matters**: Merging every 10 commits prevents massive merge conflicts (147+ conflicts) like we experienced with fix/4. Small, frequent merges = 2-5 conflicts instead of hours of resolution.

### Git Aliases Configured

- `git commits-ahead` - Show how many commits ahead of main
- `git sync` - Pull main and return to your branch
- `git imerge` - Incremental merge (pull main → merge your branch)

## Pre-commit Quality Gates

Enhanced pre-commit hook (`.git/hooks/pre-commit`) runs automatically before each commit.

### Pre-commit Checks (10 total)

1. **File Size Validation** - Blocks files >5MB from being committed
2. **Security Scan** - Detects hardcoded secrets, API keys, tokens in code
3. **JavaScript/TypeScript** - ESLint with auto-fix, checks for console.log/debugger
4. **Python Linting** - Ruff check + format, warns about print statements
5. **PowerShell Analysis** - PSScriptAnalyzer for script quality
6. **Rust Formatting** - rustfmt for .rs files
7. **JSON/YAML Validation** - Syntax validation for config files
8. **Merge Conflict Detection** - Prevents committing conflict markers
9. **Import Validation** - Warns about deep relative imports (../../../)
10. **Trading System Safety** - Financial safety checks before code changes

## Trading System Safety Check (Critical)

The pre-commit hook includes safety validation for the crypto trading system.

### Blocks commits if

- More than 5 failed orders in last 24 hours
- More than 10 errors in last 100 log lines
- Missing critical files (config.py, nonce_state_primary.json)

### Warns if

- 1-5 failed orders detected (acceptable range)
- Open positions with P&L < -$5

**Why This Matters**: Prevents committing code changes when the trading system is unhealthy, reducing risk of compounding issues during live trading.

### Performance

- Target: <5 seconds execution time
- Typical: 2-3 seconds for clean commits
- Uses parallel checks where possible

### Bypass (Emergency Only)

```bash
git commit --no-verify -m "emergency fix"  # Skip all hooks
```

**WARNING**: Only use `--no-verify` in emergencies. Always fix the actual error instead of bypassing hooks.

## Current State Tracking

Check these locations for system state:

- **Git Status**: Modified files indicate active work areas
- **Trading Logs**: `logs/trading.log` and `trading_new.log`
- **Session Status**: `apps/crypto-enhanced/SESSION_STATUS.md`
- **Database State**: `trading.db` for orders/positions
