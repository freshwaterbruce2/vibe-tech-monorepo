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
6. Line-count check — Enforces the 500-line soft warning and 1000-line hard block limits on staged code (via `scripts/validate-file-size.js`).

**Bypass (emergency only):**

```bash
git commit --no-verify -m "emergency fix"
```

Always fix the actual error instead of bypassing hooks. Do NOT bypass trading safety checks.

## End-of-Session Commit/PR Rule

Every editor and agent must leave the repository in a commit-ready state at the end of a work session. Needed work must not remain uncommitted, unstaged, or unpushed locally.

Run `git status --short` before finishing:

1. **Complete and quality-gates pass** — commit with a descriptive message, push to the feature branch, and open/mark the PR ready.
2. **Incomplete but compiles/passes local checks** — make a WIP commit, push, and open the PR as a **Draft**.
3. **Broken or untested** — stash it (`git stash push -m "WIP: <description>"`) and report the stash in the session summary. Do not push broken code to a shared branch unless it is on a dedicated experimental branch.

Discipline:

- Never commit directly to `main`, `develop`, or other protected branches.
- Use short-lived, single-task branches.
- Keep PRs small and focused; split branches that have grown beyond one logical concern.
- Run affected quality checks before committing (`pnpm nx affected -t lint typecheck test` or `pnpm run quality:affected`).
- Do not stage unrelated user changes; mention any you leave unstaged.
- Do not amend, rebase, reset, or rewrite history unless explicitly asked.
- Do not bypass pre-commit hooks except in genuine emergencies.
