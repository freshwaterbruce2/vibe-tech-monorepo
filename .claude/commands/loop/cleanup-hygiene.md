---
description: Autonomous cleanup loop - removes stale files and artifacts in 6 phases
allowed-tools: Bash, Read, Glob, Grep
---

# Loop Cleanup Hygiene - Remove Stale Files and Artifacts

Runs through 6 sequential cleanup phases, one phase per turn. Commits after each phase.

## Absolute Prohibitions

- NEVER delete source code files (.ts, .tsx, .rs, .py, .js, .jsx, .mjs)
- NEVER delete `.env`, config files, or database files
- NEVER delete anything in `apps/crypto-enhanced/`
- NEVER delete files that are imported/referenced by other code (grep first!)
- NEVER modify `.git/hooks/`, `.github/workflows/`, or CI config
- NEVER use `git push --force` or `git reset --hard`
- NEVER install/remove dependencies
- STOP if 3 consecutive pre-commit hook failures occur

## Per-Turn Workflow

### 1. Read State

```bash
SESSION_DIR="D:/logs/loop-sessions/$(date +%Y%m%d)"
cat "$SESSION_DIR/cleanup-state.json"
```

If `commitCount >= commitBudget` (10), STOP:

```
[cleanup-hygiene] Commit budget exhausted (10/10). Stopping.
```

If all 6 phases completed, STOP:

```
[cleanup-hygiene] All 6 phases complete. Stopping.
```

### 2. Execute Current Phase

Execute ONLY the phase matching `currentPhase`:

---

#### Phase 1: Root Debug/Output Files

Remove stale debug output files from the repository root:

```bash
# Find candidates (DO NOT delete yet)
ls -la C:/dev/*_output.txt C:/dev/*_build.txt C:/dev/*_results.txt C:/dev/*_test.txt 2>/dev/null
ls -la C:/dev/lint-report.json C:/dev/lint_*.txt C:/dev/graph.json 2>/dev/null
```

For each file found:
1. Check if it's tracked by git: `git ls-files --error-unmatch FILE 2>/dev/null`
2. If tracked: `git rm FILE`
3. If untracked: just delete it (won't need a commit)

Also look for the already-deleted files in git status:

```bash
git status --porcelain | grep "^ D " | head -20
```

Stage any already-deleted files that are debug artifacts.

Commit: `chore: remove stale debug output files`

---

#### Phase 2: Build Artifacts

Stage already-deleted build artifacts that show in git status:

```bash
# Check for deleted dist-electron files already showing
git status --porcelain | grep "dist-electron" | head -30
```

Stage them:

```bash
git add apps/vibe-code-studio/dist-electron/ 2>/dev/null
```

Also check for other build artifacts that shouldn't be tracked:

```bash
git ls-files -- '*/dist-electron/*' '*/win-unpacked/*' 2>/dev/null | head -20
```

If any found, `git rm --cached` them.

Commit: `chore: remove tracked build artifacts (dist-electron)`

---

#### Phase 3: Stale Documentation

Check for stale/orphaned documentation:

```bash
# List docs that might be stale
ls C:/dev/docs/archive/ C:/dev/docs/deprecated/ 2>/dev/null
```

For ANY documentation file before deleting, verify it's not linked from other docs:

```bash
# For each candidate doc, check references
grep -r "FILENAME" C:/dev/docs/ C:/dev/CLAUDE.md C:/dev/AI.md C:/dev/README.md 2>/dev/null | head -5
```

Only remove docs that have ZERO references from other files.

If `scripts/docs-cleanup.ps1` exists, run it in dry-run first:

```bash
powershell -ExecutionPolicy Bypass -File C:/dev/scripts/docs-cleanup.ps1 -DryRun 2>&1 | tail -20
```

Review output. If safe, run without dry-run. Stage and commit.

Commit: `chore: remove stale documentation`

---

#### Phase 4: tmp/ Directory Cleanup

```bash
# Find reports older than 7 days
find C:/dev/tmp/ -type f -mtime +7 2>/dev/null | head -20
```

For each file:
1. Check if tracked: `git ls-files --error-unmatch FILE 2>/dev/null`
2. If tracked and older than 7 days: `git rm FILE`
3. If untracked and older than 7 days: delete it

Commit: `chore: clean stale tmp/ reports older than 7 days`

---

#### Phase 5: .gitignore Gaps

Read the current .gitignore:

```bash
cat C:/dev/.gitignore
```

Check if these patterns are already present. Add any that are missing:

- `*_output.txt` (debug outputs)
- `*_build.txt` (build logs)
- `*_results.txt` (test results)
- `dist-electron/` (Electron build artifacts)
- `.cargo/` (Rust build cache)
- `*.coverage` (coverage files)
- `loop.log` (loop session logs)

Use Edit tool to append missing patterns to `.gitignore`. Do NOT remove existing patterns.

Commit: `chore: add missing patterns to .gitignore`

---

#### Phase 6: Orphaned Worktrees

```bash
git worktree list 2>&1
```

If stale worktrees exist:

```bash
git worktree prune -v 2>&1
```

Also clean up any leftover lock files:

```bash
find C:/dev/.git/worktrees/ -name "*.lock" -mtime +1 2>/dev/null
```

Commit only if `.git/worktrees/` changed (unlikely to need commit for this).

---

### 3. Stage and Commit

After each phase, stage relevant files and commit. If pre-commit fails:
- Unstage: `git restore --staged .`
- Log failure
- Increment failure counter
- Move to next phase anyway

### 4. Update State

Write updated state to `D:/logs/loop-sessions/YYYYMMDD/cleanup-state.json`:
- Increment `currentPhase`
- Update `commitCount`
- Add phase number to `completedPhases`

### 5. Log

```bash
echo "[$(date -Iseconds)] [cleanup-hygiene] Phase N: DESCRIPTION, commit: YES/NO/SKIPPED" >> "$SESSION_DIR/loop.log"
```

## File Scope Rules

Loop 2 (this loop) ONLY touches:
- Root debug/output files (`*_output.txt`, `*_build.txt`, etc.)
- `docs/archive/`, `docs/deprecated/`
- `tmp/` directory
- `.gitignore`
- Build artifact references (dist-electron)
- Git worktree metadata

NEVER touch:
- `apps/*/src/**` or `packages/*/src/**` (that's Loop 1's domain)
- Any source code file
- Database files on D:\
- CI/CD configuration

## Recovery

1. Check D:\logs\loop-sessions\YYYYMMDD\loop.log
2. `git log --oneline -10` to see cleanup commits
3. `git revert HEAD~N..HEAD` to undo
4. Or restore snapshot: `Restore-Snapshot.ps1 -Tag "pre-loop-YYYYMMDD"`
