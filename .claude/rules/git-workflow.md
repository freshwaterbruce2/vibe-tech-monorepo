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

## Pre-commit Checks (6 total, auto-run)

1. Protected-branch check — Refuses direct commits to `main`, `master`, or `develop` branches.
2. Active-project lock boundary check — Validates modifications against `D:/active-project/active-project.json`.
3. ESLint check — Runs ESLint on staged JavaScript/TypeScript files.
4. TypeScript typecheck — Runs Nx affected typecheck on staged files.
5. Byte-size check — Blocks staged files exceeding 5MB.
6. Line-count check — Enforces the 500-line soft warning and 600-line hard block limits on staged code (via `scripts/validate-file-size.js`).

**Bypass (emergency only):**
```bash
git commit --no-verify -m "emergency fix"
```

Always fix the actual error instead of bypassing hooks. Do NOT bypass trading safety checks.
