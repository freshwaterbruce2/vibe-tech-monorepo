# No Git Workflow

**Last Updated:** 2026-01-14
**Status:** ACTIVE - CRITICAL INFORMATION

---

## Important: Git NOT Used

**The user is NO LONGER using Git for version control.**

### What This Means

**DO NOT suggest:**

- ❌ Git commands (commit, push, pull, merge, branch)
- ❌ Git workflows (incremental merge strategy, feature branches)
- ❌ Pre-commit hooks (git hooks)
- ❌ Git-based collaboration (pull requests, merge conflicts)
- ❌ `.git/` directory operations
- ❌ GitHub/GitLab workflows

**IGNORE these documentation sections:**

- ❌ `CLAUDE.md` → "Git Workflow" section
- ❌ `MONOREPO_WORKFLOW.md` → Git incremental merge strategy
- ❌ `.claude/rules/git-workflow.md` → All Git-related rules
- ❌ Git hooks in `.git/hooks/pre-commit`
- ❌ Git aliases (commits-ahead, sync, imerge)
- ❌ Memory: "git-workflow-incremental-merge" (OBSOLETE)

### Alternative Workflows

**Version Control:**

- User manages versions manually
- May use file system backups
- May use cloud sync (OneDrive, Dropbox, etc.)

**Code Review:**

- Direct file inspection
- Manual code review process
- No pull request workflow

**Deployment:**

- Direct file copying
- Manual deployment process
- No CI/CD pipelines (unless explicitly configured separately)

### Documentation That Still Applies

**KEEP using:**

- ✅ Nx commands (run, affected, build, test)
- ✅ pnpm package manager commands
- ✅ Code quality checks (ESLint, TypeScript, tests)
- ✅ Database management (D:\ storage)
- ✅ Learning system (agent_learning.db)
- ✅ Monorepo structure (apps/, packages/, backend/)
- ✅ Path policy (C:\dev for code, D:\ for data)
- ✅ VS Code + Nx Console integration
- ✅ Claude Code / Augment AI workflows

### When User Asks About Version Control

**Response:**
"I understand you're not using Git. Would you like me to:

1. Create manual file backups?
2. Document changes in a CHANGELOG.md?
3. Use file timestamps for versioning?
4. Set up an alternative version control system?"

### Historical Context

**Previous Setup (NO LONGER ACTIVE):**

- Git repository: <https://github.com/freshwaterbruce2/vibetech.git>
- Branch: feature/deepseek-default-model
- Main branch: main
- Had Git aliases configured (commits-ahead, sync, imerge)
- Had pre-commit hooks for quality checks

**Now:**

- No Git repository
- No branches
- No commits
- Quality checks run manually or via Nx/pnpm scripts

### Quality Checks Without Git Hooks

**Run manually:**

```bash
# Lint
pnpm run lint

# Type check
pnpm run typecheck

# Tests
pnpm run test

# Full quality pipeline
pnpm run quality

# Affected projects only
pnpm nx affected -t lint,test,typecheck
```

### File Backup Strategy (Recommended)

**Manual Backups:**

```powershell
# Backup entire workspace
Copy-Item -Path C:\dev -Destination "D:\backups\dev-$(Get-Date -Format 'yyyy-MM-dd-HHmm')" -Recurse

# Backup specific project
Copy-Item -Path C:\dev\apps\nova-agent -Destination "D:\backups\nova-agent-$(Get-Date -Format 'yyyy-MM-dd-HHmm')" -Recurse
```

**Automated Backups (Optional):**

```powershell
# Create scheduled task for daily backups
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\dev\scripts\backup-workspace.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 11:59PM
Register-ScheduledTask -TaskName "VibeTech Workspace Backup" -Action $action -Trigger $trigger
```

---

**CRITICAL:** Always check this memory before suggesting Git-related workflows or commands.

---

*Memory Retention:* 90 days (auto-cleanup)
*Priority:* CRITICAL
*Affects:* All workflow recommendations, documentation references, version control suggestions
