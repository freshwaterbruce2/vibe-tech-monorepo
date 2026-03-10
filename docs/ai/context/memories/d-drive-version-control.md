# D:\ Drive Version Control System

**Last Updated:** 2026-01-14
**Status:** ACTIVE - PRODUCTION READY
**Location:** D:\repositories\vibetech
**Workspace:** C:\dev

---

## Overview

A PowerShell-based version control system using D:\ drive as a local repository (Git alternative). Perfect for solo development without Git complexity.

---

## Quick Commands

**Initialize (first time only):**

```powershell
cd C:\dev\scripts\version-control
.\Initialize-LocalRepo.ps1
```

**Create snapshot (like git commit):**

```powershell
.\Save-Snapshot.ps1 -Description "Your message here"
.\Save-Snapshot.ps1 -Description "Production release" -Tag "v1.0.0"
```

**View history (like git log):**

```powershell
.\List-Snapshots.ps1
.\List-Snapshots.ps1 -Limit 20    # Last 20
.\List-Snapshots.ps1 -Branch "main"
```

**Restore snapshot (like git checkout):**

```powershell
.\Restore-Snapshot.ps1 -SnapshotId "20260114-153000"
```

**Quick start:**

```powershell
.\QUICK_START.ps1  # Interactive setup
```

---

## Key Features

**Snapshots:**

- Timestamped workspace copies (YYYYMMDD-HHMMSS)
- Compressed to ~3% original size (97% smaller!)
- Includes metadata (description, file count, author, branch)
- Automatic CHANGELOG.md updates

**Branches:**

- Separate development lines
- Default: "main"
- Metadata tracked per branch

**Tags:**

- Named references to important snapshots
- Examples: "v1.0.0", "production", "milestone-1"

**Rollback:**

- Restore workspace to any previous snapshot
- Automatic backup before restore
- Preserves excluded directories (node_modules)

---

## Directory Structure

```
D:\repositories\vibetech\
├── snapshots\          # Timestamped workspace snapshots
├── branches\           # Branch metadata
├── tags\               # Tagged snapshots
├── metadata\           # Extended metadata
├── logs\               # CHANGELOG.md
├── staging\            # Temporary staging
└── .config\            # Configuration
```

---

## Configuration

**File:** `D:\repositories\vibetech\.config\repository.json`

**Key settings:**

- **compression:** true (97% smaller snapshots)
- **compressionLevel:** "Optimal"
- **retentionDays:** 90 (auto-cleanup old snapshots)
- **excludePatterns:** node_modules, dist, .nx, coverage

**Exclusions (like .gitignore):**

- node_modules/ - Dependencies
- dist/ - Build outputs
- .nx/, .turbo/ - Caches
- coverage/ - Test coverage
- target/ - Rust builds

---

## Common Workflows

**Daily development:**

```powershell
# Morning
.\Save-Snapshot.ps1 -Description "Start of day - stable state"

# During work
.\Save-Snapshot.ps1 -Description "Implemented user profile page"

# End of day
.\Save-Snapshot.ps1 -Description "End of day - all tests passing"
```

**Before risky changes:**

```powershell
# Before
.\Save-Snapshot.ps1 -Description "Before refactoring auth system"

# After (if successful)
.\Save-Snapshot.ps1 -Description "After refactoring - tests pass"

# After (if failed)
.\Restore-Snapshot.ps1 -SnapshotId "<before-snapshot-id>"
```

**Creating releases:**

```powershell
pnpm run quality  # Run quality checks
.\Save-Snapshot.ps1 -Description "Production release v1.0.0" -Tag "v1.0.0"
```

---

## Advantages Over Git

**✅ Simplicity:**

- No complex commands (rebase, cherry-pick, stash)
- No merge conflicts
- No detached HEAD states
- Pure PowerShell (Windows-native)

**✅ Transparency:**

- Snapshots are ZIP files (easy to inspect)
- Metadata is JSON (human-readable)
- CHANGELOG auto-generated
- No hidden .git directory

**✅ Rollback:**

- Full workspace restore (no partial states)
- Automatic backup before restore
- Preserves node_modules/ (no reinstall)

---

## Storage Optimization

**Compression:**

- 97% smaller snapshots (500 MB → 15 MB)
- Level: "Optimal" (best compression)

**Retention:**

- Auto-delete snapshots older than 90 days
- Configurable: retentionDays in repository.json

**Excluded directories:**

- node_modules/ (~200 MB)
- dist/ (~50 MB)
- .nx/, .turbo/ (~100 MB)
- coverage/ (~20 MB)

---

## Scripts Reference

**Core scripts (C:\dev\scripts\version-control\):**

- `Initialize-LocalRepo.ps1` - Initialize repository (first time)
- `Save-Snapshot.ps1` - Create snapshot (like git commit)
- `List-Snapshots.ps1` - View history (like git log)
- `Restore-Snapshot.ps1` - Restore snapshot (like git checkout)
- `QUICK_START.ps1` - Interactive setup and tutorial

**Future scripts (planned):**

- `Create-Branch.ps1` - Branch management
- `Switch-Branch.ps1` - Branch switching
- `Compare-Snapshots.ps1` - Diff between snapshots
- `Merge-Branch.ps1` - Simple branch merging

---

## Documentation

**Main guide:**

- `C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md` (comprehensive 500+ line guide)

**Repository README:**

- `D:\repositories\vibetech\README.md` (auto-generated)

**Script help:**

```powershell
Get-Help .\Save-Snapshot.ps1 -Detailed
Get-Help .\List-Snapshots.ps1 -Examples
```

---

## Comparison to Git

| Feature | Git | D:\ Version Control |
|---------|-----|---------------------|
| Snapshots | Commits | Timestamped snapshots |
| Branches | Yes | Metadata-based |
| Tags | Yes | Tagged snapshots |
| Rollback | `git reset --hard` | Restore snapshot |
| History | `git log` | List snapshots |
| Storage | `.git/` | `D:\repositories\` |
| Remote | GitHub/GitLab | N/A (local only) |
| Merge | Complex | Manual |
| Conflicts | Auto-detect | N/A |
| Learning Curve | Steep | Simple |

---

## Integration with Workspace

**Environment variables:**

```bash
# Apps can reference snapshots if needed
SNAPSHOT_REPO=D:\repositories\vibetech
```

**Nx integration:**

```powershell
# Create snapshot after successful build
pnpm nx affected -t build,test,lint
.\Save-Snapshot.ps1 -Description "All quality checks passed"
```

**Automated snapshots:**

```powershell
# Daily snapshot at 11:59 PM (optional)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\dev\scripts\version-control\Save-Snapshot.ps1 -Description 'Daily automatic snapshot'"
$trigger = New-ScheduledTaskTrigger -Daily -At 11:59PM
Register-ScheduledTask -TaskName "VibeTech Daily Snapshot" -Action $action -Trigger $trigger
```

---

## Best Practices

**Snapshot frequency:**

- Daily: End of day snapshots
- Before risky changes: Refactoring, upgrades
- After milestones: Features complete, bugs fixed
- Before deployments: Production releases

**Good descriptions:**

- "Added user authentication with JWT"
- "Fixed critical bug in payment processing"
- "End of day - all tests passing"

**Bad descriptions:**

- "stuff", "changes", "wip", (empty)

---

## Status: Production Ready

**✅ Implemented:**

- Repository initialization
- Snapshot creation with compression
- Snapshot listing and filtering
- Snapshot restoration with backup
- Metadata tracking (JSON)
- CHANGELOG auto-generation
- Tag support
- Branch metadata
- Exclusion patterns
- Interactive quick start

**⏳ Future enhancements:**

- Branch management scripts
- Snapshot comparison (diff)
- Export/import snapshots
- GUI interface (PowerShell WPF)

---

**Memory Retention:** 90 days
**Priority:** HIGH (main version control method)
**Affects:** All development workflow, backup strategy, rollback procedures
