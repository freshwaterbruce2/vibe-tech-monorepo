# Git Workflow & Pre-commit Hooks

## Incremental Merge Strategy

Merge to main every 10 commits to prevent massive conflicts (learned from 147-conflict incidents).

```bash
git commits-ahead              # check how far ahead you are

# At 10 commits, merge:
git checkout main && git pull
git merge feature/your-branch --no-ff
git push origin main
git checkout feature/your-branch
```

Aliases: `git commits-ahead`, `git sync`, `git imerge`

## Pre-commit Checks (10 total, auto-run)

1. File size validation — blocks >5MB files
2. Security scan — detects hardcoded secrets/API keys
3. JavaScript/TypeScript — ESLint auto-fix, no console.log/debugger
4. Python linting — Ruff check + format
5. PowerShell analysis — PSScriptAnalyzer
6. Rust formatting — rustfmt
7. JSON/YAML validation — syntax check
8. Merge conflict detection — blocks conflict markers
9. Import validation — warns on deep relative imports (`../../../`)
10. Trading system safety — blocks commits when trading system is unhealthy

**Bypass (emergency only):**
```bash
git commit --no-verify -m "emergency fix"
```

Always fix the actual error instead of bypassing hooks. Do NOT bypass trading safety checks.
