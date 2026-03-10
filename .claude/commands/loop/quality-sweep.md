---
description: Autonomous lint/typecheck fix loop - processes one project per turn
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Loop Quality Sweep - Auto-Fix Lint and Type Errors

Processes ONE Nx project per turn. Fixes lint errors with --fix, then manually fixes remaining lint and typecheck errors. Auto-commits per project.

## Absolute Prohibitions

- NEVER modify `apps/crypto-enhanced/` or any file in it
- NEVER modify `.env`, `*.key`, `*.pem`, `*.secret` files
- NEVER modify database files on D:\
- NEVER modify `.git/hooks/`, `.github/workflows/`, or CI config
- NEVER delete files or remove/install dependencies
- NEVER use `git push --force` or `git reset --hard`
- NEVER modify security-critical code (auth, encryption, API key handling)
- STOP if 3 consecutive pre-commit hook failures occur

## Per-Turn Workflow

### 1. Read State

```bash
SESSION_DIR="D:/logs/loop-sessions/$(date +%Y%m%d)"
cat "$SESSION_DIR/quality-sweep-state.json"
```

Parse the state. If `commitCount >= commitBudget` (20), STOP:

```
[quality-sweep] Commit budget exhausted (20/20). Stopping.
```

If `consecutivePrecommitFailures >= 3`, STOP:

```
[quality-sweep] 3 consecutive pre-commit failures. Stopping for safety.
```

### 2. Select Next Project

```bash
npx nx show projects 2>/dev/null | sort
```

Pick the project at `projectIndex` from the sorted list. Skip projects in `processedProjects` or `failedProjects`. If all processed, STOP.

Skip these projects entirely:
- `crypto-enhanced`
- Any project name containing `e2e` or `storybook`

### 3. Run Lint with Auto-Fix

```bash
pnpm nx lint PROJECT_NAME --fix 2>&1 | tail -40
```

Record the output. If lint passes cleanly, move to step 4.

If lint errors remain after `--fix`, read ONLY the files with errors. Apply fixes using the Edit tool:
- Fix unused imports: remove them
- Fix missing return types: add explicit types
- Fix `any` types: replace with proper types where obvious
- Fix formatting: follow existing patterns

**Max 3 fix iterations per project.** If errors persist after 3 rounds, log as failed and move on.

### 4. Run Typecheck

```bash
pnpm nx typecheck PROJECT_NAME 2>&1 | tail -40
```

If typecheck passes, move to step 5.

If typecheck errors exist:
- Read the erroring files
- Fix obvious type errors (missing properties, wrong types, import issues)
- Do NOT attempt complex refactors
- Max 3 fix iterations

If errors persist after 3 rounds, log as partially fixed and move on.

### 5. Stage and Commit

Stage ONLY files belonging to this project:

```bash
# Determine project root
PROJECT_ROOT=$(npx nx show project PROJECT_NAME --json 2>/dev/null | grep -o '"root":"[^"]*"' | cut -d'"' -f4)
git add "$PROJECT_ROOT/" 2>/dev/null
```

Check if there are staged changes:

```bash
git diff --cached --stat
```

If no staged changes, skip commit and move to next project.

If there are changes, commit:

```bash
git commit -m "$(cat <<'EOF'
fix(PROJECT_NAME): auto-fix lint and type errors

Automated fixes applied by overnight quality sweep loop.
EOF
)"
```

### 6. Handle Pre-Commit Result

If commit succeeds:
- Reset `consecutivePrecommitFailures` to 0
- Increment `commitCount`
- Add project to `processedProjects`
- Log success

If pre-commit hook fails:
- Increment `consecutivePrecommitFailures`
- Unstage all changes: `git restore --staged .`
- Add project to `failedProjects`
- Log failure with reason

### 7. Auto-Merge Check

If `commitCount` is a multiple of 10 and > 0:

```bash
CURRENT_BRANCH=$(git branch --show-current)
git checkout main && git pull origin main 2>/dev/null
git merge "$CURRENT_BRANCH" --no-ff -m "chore: auto-merge loop commits (batch)" 2>&1
MERGE_RESULT=$?
git checkout "$CURRENT_BRANCH"
```

If merge fails, log the error but continue on the loop branch. Do NOT force anything.

### 8. Update State

Write updated state back to `D:/logs/loop-sessions/YYYYMMDD/quality-sweep-state.json`:
- Increment `projectIndex`
- Update `commitCount`
- Update `processedProjects` or `failedProjects`
- Update `consecutivePrecommitFailures`

### 9. Log

Append to `D:/logs/loop-sessions/YYYYMMDD/loop.log`:

```bash
echo "[$(date -Iseconds)] [quality-sweep] [PROJECT_NAME] lint: N errors fixed, typecheck: PASS/FAIL, commit: YES/NO/SKIPPED" >> "$SESSION_DIR/loop.log"
```

## File Scope Rules

Loop 1 (this loop) ONLY touches source code:
- `apps/*/src/**`
- `packages/*/src/**`
- `packages/*/index.ts`
- `apps/*/tsconfig*.json` (only to fix lint scope issues)

NEVER touch:
- Root config files (nx.json, package.json, .gitignore)
- `docs/`, `tmp/`, `scripts/`
- Build artifacts, test fixtures
- Any file outside the current project's root

## Recovery

If something goes wrong:
1. Check D:\logs\loop-sessions\YYYYMMDD\loop.log
2. `git log --oneline -20` to see what was committed
3. `git revert HEAD~N..HEAD` to undo N commits
4. Or restore D:\ snapshot: `Restore-Snapshot.ps1 -Tag "pre-loop-YYYYMMDD"`
