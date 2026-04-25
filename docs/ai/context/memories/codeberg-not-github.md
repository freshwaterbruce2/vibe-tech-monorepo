# GitHub Platform (NOT Codeberg)

**Created:** 2026-01-23
**Updated:** 2026-03-09
**Priority:** CRITICAL - MANDATORY
**Enforcement:** All AI agents MUST follow this

---

## Core Fact

**THIS PROJECT USES GITHUB, NOT CODEBERG**

- **Platform:** GitHub (github.com)
- **Username:** freshwaterbruce2
- **Repository:** Monorepo
- **Remote URL:** `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`
- **CI/CD:** GitHub Actions

---

## Rules for AI Agents

### ALWAYS Use These Terms:

- "GitHub" for remote repository
- "GitHub Actions" for CI/CD pipelines
- "github.com/freshwaterbruce2/vibe-tech-monorepo" for repository URL
- ".github/workflows/" for CI configuration directory

### NEVER Use These Terms (for this project):

- "Codeberg" for this project's repository
- "Woodpecker CI" for CI/CD
- "codeberg.org" URLs for this project
- ".woodpecker.yml" for CI config
- "Forgejo" for this project's platform

---

## Git Remote Configuration

```bash
# Correct remote (GitHub)
git remote -v
origin  https://github.com/freshwaterbruce2/vibe-tech-monorepo.git (fetch)
origin  https://github.com/freshwaterbruce2/vibe-tech-monorepo.git (push)

# If remote is wrong, fix it:
git remote set-url origin https://github.com/freshwaterbruce2/vibe-tech-monorepo.git
```

---

## CI/CD: GitHub Actions

**Configuration:** `.github/workflows/` (in project root)

**Features:**
- Windows-compatible runners
- Path filtering for monorepo optimization
- Native GitHub integration

---

## Version Control Architecture

**Two-Tier System:**

1. **D:\ Snapshots** (Primary for local/data)
   - Location: `D:\repositories\vibetech\`
   - PowerShell-based version control
   - Daily backups, milestone checkpoints

2. **GitHub** (Primary for source code)
   - Remote backup
   - Collaboration
   - CI/CD integration
   - Issue tracking

---

## Common Commands

```bash
git push origin main  # Pushes to GitHub
gh pr create          # GitHub CLI command
```

---

## Documentation References

- **Version Control:** `.claude/rules/version-control.md`
- **CI/CD:** `.claude/rules/ci-cd-nx.md`

---

## Migration Complete

**Status:** COMPLETE (migrated to GitHub 2026-03-09)

**Checklist:**
- [x] Git remote points to GitHub
- [x] Documentation updated
- [x] CI/CD uses GitHub Actions
- [x] Memory file updated (this file)
- [x] All agents instructed

---

**REMEMBER:** When you see "git remote", "CI/CD", or "repository", think **GITHUB**, not Codeberg!

---

_This memory ensures all AI agents consistently use GitHub terminology._
