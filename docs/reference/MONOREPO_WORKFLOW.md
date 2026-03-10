# Monorepo Git Workflow - C:\dev

**2025 Best Practice: Incremental Merging for Nx + pnpm Monorepos**

## 📦 Monorepo Structure

**C:\dev = ONE REPOSITORY with ALL projects inside**

- **Repository**: `https://github.com/freshwaterbruce2/Monorepo.git`
- **Strategy**: Monorepo (Google, Meta, Microsoft approach)
- **Projects**: Web apps, desktop apps, mobile apps, Python services, shared packages
- **Benefits**: Code sharing, unified tooling, Nx caching, atomic commits

**📖 Full monorepo philosophy:** See `CLAUDE.md` → "Monorepo Philosophy" section

**⚠️ Do NOT create separate repos for each project** - that defeats the monorepo benefits!

## Core Principle: Merge Every 10 Commits

> "It's easier to merge every 10th commit into master and work through conflicts that way... the divergence is less significant with each merge than trying to merge them all at once."

## Daily Development Workflow

### 1. Start Your Work Session

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create or switch to your feature branch
git checkout -b feature/your-feature
# OR
git checkout feature/your-feature
```

### 2. Code and Commit Frequently

```bash
# Make small, focused commits (aim for 1-3 per day)
git add <files>
git commit -m "feat: specific change description"
```

### 3. Track Your Commit Count

Keep a mental note or use this command:

```bash
# Check how many commits ahead of main
git rev-list --count main..HEAD
```

**Visual indicator in your terminal:**

```bash
# Add to your PS1 or use this alias
alias commits-ahead='git rev-list --count main..HEAD'
```

### 4. Merge Back to Main Every 10 Commits

When you hit ~10 commits (or every 2-3 days):

```bash
# Step 1: Get latest main
git checkout main
git pull origin main

# Step 2: Merge your feature branch
git merge feature/your-feature --no-ff

# Step 3: Handle any conflicts (will be small)
# ... resolve conflicts ...
git add .
git commit

# Step 4: Push to main
git push origin main

# Step 5: Continue working on your feature branch
git checkout feature/your-feature
```

## Why This Works

### Traditional Approach (BAD)

```
feature/big-feature: 100 commits ahead of main
├─ Try to merge: 147 conflicts 😱
└─ Takes hours to resolve
```

### Incremental Approach (GOOD)

```
Commit 1-10:  Merge → 2-5 conflicts ✅
Commit 11-20: Merge → 3-4 conflicts ✅
Commit 21-30: Merge → 1-2 conflicts ✅
```

**Total effort:** 30 minutes vs. 3+ hours

## Nx Monorepo Specific Benefits

### 1. Nx Affected Commands Work Better

```bash
# After each merge, Nx can accurately detect what changed
pnpm nx affected:build
pnpm nx affected:test
```

### 2. Smaller CI/CD Runs

- Merging frequently means smaller changesets
- Faster CI pipelines (only affected projects)
- Easier to pinpoint failures

### 3. Team Collaboration

- Other developers get your changes sooner
- Reduces merge conflicts for everyone
- Enables parallel work on different packages

## Emergency Procedures

### If You Miss the 10-Commit Mark

**20-30 commits behind?**

```bash
# Do intermediate merges in batches
git checkout main
git pull origin main

# Merge in chunks using interactive rebase
git checkout feature/your-feature
git rebase -i main

# Pick first 10 commits, then merge
# Repeat for next 10
```

**50+ commits behind? (Like fix/4 situation)**

```bash
# DON'T try to merge everything
# Option 1: Continue on feature branch, merge when ready
# Option 2: Create fresh branch from main, cherry-pick critical commits
# Option 3: Accept divergence, work on feature branch independently
```

### Git Lock File Issues

If you encounter `.git/index.lock` errors:

```bash
# Use the documented solution
git fetch --prune && rm -f .git/index.lock
```

Reference: `GIT_TROUBLESHOOTING_LEARNINGS.md`

## Branch Naming Convention

```
feature/short-description   # New features (merge every 10 commits)
fix/bug-name                # Bug fixes (merge when complete)
refactor/component-name     # Refactoring (merge every 10 commits)
docs/update-description     # Documentation (merge when complete)
```

## Commit Message Format

Follow Conventional Commits:

```
feat(scope): add new functionality
fix(scope): resolve bug in component
refactor(scope): improve code structure
docs(scope): update documentation
test(scope): add test coverage
chore(scope): update dependencies
```

## Integration with Nx

### Before Each Merge

```bash
# Run quality checks on affected projects
pnpm nx affected:lint
pnpm nx affected:test
pnpm nx affected:build
```

### After Each Merge

```bash
# Verify workspace health
pnpm nx graph  # Check dependency graph
```

## Metrics to Track

Keep these visible in your development environment:

- **Commits since last merge:** `git rev-list --count main..HEAD`
- **Days since last merge:** Track manually or with git hooks
- **Conflict count per merge:** Aim to keep under 5

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  MONOREPO WORKFLOW QUICK REFERENCE          │
├─────────────────────────────────────────────┤
│  Daily:                                     │
│  1. git checkout main && git pull           │
│  2. git checkout feature/name               │
│  3. Code → Commit (small, focused)          │
│                                             │
│  Every 10 Commits:                          │
│  1. git checkout main && git pull           │
│  2. git merge feature/name --no-ff          │
│  3. Resolve conflicts (should be <5)        │
│  4. git push origin main                    │
│  5. git checkout feature/name               │
│                                             │
│  Emergency:                                 │
│  - Lock file: git fetch --prune && rm lock  │
│  - Too many commits: Batch merge in 10s     │
│  - Massive divergence: Continue on branch   │
└─────────────────────────────────────────────┘
```

## Current Branches Status

### fix/4 (Your Current Branch)

- **Status:** Working development branch
- **Commits:** 2 ahead of origin (TypeScript fixes)
- **Strategy:** Continue development here, merge to main when ready
- **Note:** Don't try to merge with main yet (147 conflicts)

### Going Forward

- New features: Create from main, merge every 10 commits
- Bug fixes: Create from main, merge when complete
- Keep fix/4 as stable development environment

## Tools and Automation

### Recommended Git Aliases

```bash
# Add to ~/.gitconfig
[alias]
  ca = "!f() { git rev-list --count main..HEAD; }; f"  # commits-ahead
  sync = "!git checkout main && git pull && git checkout -"
  imerge = "!git checkout main && git pull && git merge - --no-ff"
```

### VS Code Extension

- **GitLens:** Shows commit count in status bar
- **Git Graph:** Visualize branch divergence

### PowerShell Function

Add to your profile:

```powershell
function Show-CommitsAhead {
    $count = git rev-list --count main..HEAD 2>$null
    if ($count -gt 10) {
        Write-Host "⚠️  $count commits ahead - Time to merge!" -ForegroundColor Yellow
    } else {
        Write-Host "✓ $count commits ahead" -ForegroundColor Green
    }
}
Set-Alias commits Show-CommitsAhead
```

## Last Updated

2025-10-26 - Initial workflow documentation based on 2026 best practices
