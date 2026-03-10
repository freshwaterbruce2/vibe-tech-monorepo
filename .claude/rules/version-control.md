# Version Control Rules

Last Updated: 2026-03-09
Priority: MANDATORY
Status: ACTIVE

---

## Git Platform

- **Platform:** GitHub (github.com)
- **Owner:** freshwaterbruce2
- **Repository:** Monorepo (private)
- **Remote URL:** `https://github.com/freshwaterbruce2/Monorepo.git`
- **CI/CD:** GitHub Actions (`.github/workflows/`)

---

## Primary Version Control: D:\ Drive Snapshots

**Location:** `D:\repositories\vibetech`
**Documentation:** `.claude/rules/d-drive-version-control.md`

The project uses a **PowerShell-based local repository** for primary local backup:

- **Why:** Full local control, Windows-native, no remote dependency
- **When:** Daily backups, before risky changes, milestone checkpoints
- **How:** `.\QUICK_START.ps1` in `C:\dev\scripts\version-control\`

### Quick Commands

```powershell
# Create snapshot
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Your message here"

# List snapshots
.\List-Snapshots.ps1

# Restore snapshot
.\Restore-Snapshot.ps1 -SnapshotId "20260119-121005"
```

---

## Remote Version Control: GitHub

**Use GitHub for:**

- Remote backup and source of truth
- CI/CD pipelines (GitHub Actions)
- Issue tracking
- Collaboration (if needed in future)

**Git Workflow:**

```bash
# Check status
git status

# Stage changes
git add .

# Commit (triggers pre-commit hooks)
git commit -m "feat: your message"

# Push to GitHub
git push origin main
```

---

## Incremental Merge Strategy

**See:** `MONOREPO_WORKFLOW.md`

**Rule:** Merge to main every 10 commits to prevent massive merge conflicts

```bash
# Check commits ahead of main
git log main..HEAD --oneline | wc -l

# When >=10 commits:
git checkout main
git pull origin main
git merge feature/your-branch --no-ff
git push origin main
git checkout feature/your-branch
```

---

## Pre-commit Hooks

**Location:** `.git/hooks/pre-commit`
**Documentation:** `.claude/rules/git-workflow.md`

Automated checks before every commit:

1. File size validation (<5MB)
2. Security scan (API keys, secrets)
3. ESLint + Prettier
4. TypeScript type checking
5. Trading system safety (crypto-enhanced)

**Bypass (emergency only):**

```bash
git commit --no-verify -m "emergency fix"
```

---

## Privacy Hardening (GitHub)

- Repository is **private** - only owner can access
- Disable Copilot code training: Settings > Copilot > Policies
- Enable 2FA on GitHub account
- Use fine-grained personal access tokens (not classic)
- Enable secret scanning and push protection
- D:\ snapshot system provides platform-independent local backup

---

## Related Documentation

- **D:\ Version Control:** `.claude/rules/d-drive-version-control.md`
- **Git Workflow:** `.claude/rules/git-workflow.md`
- **Monorepo Workflow:** `MONOREPO_WORKFLOW.md`
- **Commands Reference:** `.claude/rules/commands-reference.md`

---

Enforcement: MANDATORY
**Platform:** GitHub (private repo)
**Primary Local Backup:** D:\ snapshots
