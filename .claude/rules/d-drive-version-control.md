# D:\ Drive Version Control System

Last Updated: 2026-01-16
Priority: MANDATORY
Status: ACTIVE (Initialized: 2026-01-15)

---

## Overview

The D:\ drive version control system is a **PowerShell-based local repository** that provides Git-like functionality without Git. Think of it as "local version control for D:\ data" - perfect for solo development when you don't want to deal with remote repository corruption or merge conflicts.

**Location:** `D:\repositories\vibetech`
**Workspace:** `C:\dev`
**Documentation:** `C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md`

---

## Why Use This System?

### Problems It Solves

❌ **Git Platform Issues:**

- Corrupted merges mixing old/new code
- Complex merge conflicts (147+ conflicts)
- Remote repository complexity
- No control over data storage

✅ **D:\ Version Control:**

- Simple local snapshots (no merges)
- Full workspace history
- Complete control over data
- Windows-native PowerShell
- No remote repository corruption risk

### When to Use

**ALWAYS use for:**

- Backing up D:\ databases before risky changes
- Creating checkpoints before migrations
- Saving stable states (e.g., "production-ready")
- Testing destructive operations safely
- Experimenting with new features

**DO NOT use for:**

- Code in C:\dev (use GitHub for that)
- Small, frequent edits (use manually)
- Sharing with team (this is local-only)

---

## Quick Start

### Interactive Menu (Easiest)

```powershell
cd C:\dev\scripts\version-control
.\QUICK_START.ps1
```

**Menu Options:**

1. Create a new snapshot
2. View snapshot history
3. Restore a snapshot
4. View documentation
5. Repository status
6. Exit

### Direct Commands

```powershell
# Create snapshot
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before crypto system upgrade"

# List snapshots
.\List-Snapshots.ps1

# Restore snapshot
.\Restore-Snapshot.ps1 -SnapshotId "20260116-1430"
```

---

## Core Concepts

### Snapshots (Like Git Commits)

**What:** Timestamped, compressed copy of C:\dev workspace

**Format:** `YYYYMMDD-HHMMSS` (e.g., `20260116-143000`)

**Stored:** `D:\repositories\vibetech\snapshots\<snapshot-id>\`

**Metadata:**

- Description (commit message)
- Timestamp
- Branch name
- File count
- Original size
- Compressed size (97% smaller)
- Author

**Example:**

```json
{
  "snapshotId": "20260116-143000",
  "timestamp": "2026-01-16 14:30:00",
  "description": "Before database migration",
  "branch": "main",
  "author": "fresh_zxae3v6",
  "fileCount": 12543,
  "originalSize": 2147483648,
  "compressedSize": 64424509,
  "compressionEnabled": true
}
```

### Branches (Like Git Branches)

**What:** Separate development lines

**Location:** `D:\repositories\vibetech\branches\<branch-name>\`

**Default:** `main` (protected)

**Use Cases:**

- `feature/new-ui` - UI redesign experiments
- `experimental` - Testing risky changes
- `production` - Stable releases only

**Commands:**

```powershell
.\Create-Branch.ps1 -Name "feature/ai-upgrade"
.\Switch-Branch.ps1 -Name "feature/ai-upgrade"
.\Merge-Branch.ps1 -From "feature/ai-upgrade" -To "main"
```

### Tags (Like Git Tags)

**What:** Named pointers to specific snapshots

**Location:** `D:\repositories\vibetech\tags\<tag-name>\`

**Examples:**

- `v1.0.0` - Version releases
- `production-2026-01-16` - Deployed versions
- `before-migration` - Safety checkpoints
- `stable` - Last known good state

**Commands:**

```powershell
# Tag current snapshot
.\Save-Snapshot.ps1 -Description "Production release" -Tag "v1.0.0"

# Create tag for existing snapshot
.\Create-Tag.ps1 -Name "stable" -SnapshotId "20260116-140000"

# List tags
.\List-Tags.ps1

# Restore from tag
.\Restore-Snapshot.ps1 -Tag "v1.0.0"
```

---

## Available Scripts

### Core Operations

**Initialize Repository** (one-time setup)

```powershell
.\Initialize-LocalRepo.ps1
```

**Create Snapshot**

```powershell
.\Save-Snapshot.ps1 -Description "Your message here"
.\Save-Snapshot.ps1 -Description "Before testing" -Tag "experimental-v1"
```

**List Snapshots**

```powershell
.\List-Snapshots.ps1              # All snapshots
.\List-Snapshots.ps1 -Limit 10    # Last 10
.\List-Snapshots.ps1 -Branch "main"  # Branch-specific
```

**Restore Snapshot**

```powershell
.\Restore-Snapshot.ps1 -SnapshotId "20260116-143000"
.\Restore-Snapshot.ps1 -Tag "v1.0.0"
```

### Branch Operations

```powershell
.\Create-Branch.ps1 -Name "feature/my-feature"
.\Switch-Branch.ps1 -Name "feature/my-feature"
.\List-Branches.ps1
.\Merge-Branch.ps1 -From "feature/my-feature" -To "main"
```

### Utilities

```powershell
.\Compare-Snapshots.ps1 -From "20260116-140000" -To "20260116-150000"
.\Show-History.ps1 -Limit 20
.\Repository-Status.ps1
.\Cleanup-OldSnapshots.ps1 -OlderThanDays 90
```

---

## Repository Structure

```
D:\repositories\vibetech\
├── snapshots\               # All snapshots (compressed)
│   ├── 20260116-140000\
│   │   ├── workspace.zip    # Compressed workspace
│   │   └── metadata.json    # Snapshot metadata
│   ├── 20260116-143000\
│   └── 20260116-150000\
├── branches\                # Branch metadata
│   ├── main\
│   │   └── metadata.json
│   └── feature-ai-upgrade\
├── tags\                    # Named snapshots
│   ├── v1.0.0\
│   │   ├── metadata.json
│   │   └── snapshot -> symlink to snapshot
│   └── production\
├── metadata\                # Additional metadata
├── logs\                    # Change history
│   └── CHANGELOG.md
├── staging\                 # Temporary workspace
└── .config\                 # Configuration
    ├── repository.json      # Main config
    ├── status.json          # Current state
    └── exclude.txt          # Exclusion patterns
```

---

## Configuration

**Location:** `D:\repositories\vibetech\.config\repository.json`

**Key Settings:**

```json
{
  "repositoryVersion": "1.0.0",
  "workspacePath": "C:\\dev",
  "currentBranch": "main",
  "compression": true,
  "compressionLevel": "Optimal",
  "retentionDays": 90,
  "excludePatterns": ["node_modules/**", "dist/**", ".nx/**", "coverage/**", "**/*.tsbuildinfo"]
}
```

**Exclusion Patterns** (saves space):

- `node_modules/**` - npm packages (can reinstall)
- `dist/**` - Build outputs (regenerate)
- `.nx/**` - Nx cache (regenerate)
- `coverage/**` - Test reports
- `target/**` - Rust build outputs

**Compression:**

- Enabled by default (97% smaller)
- Optimal level (best balance)
- Example: 2 GB → 64 MB

---

## Common Workflows

### Before Risky Changes

```powershell
cd C:\dev\scripts\version-control

# Create safety checkpoint
.\Save-Snapshot.ps1 -Description "Before database migration" -Tag "pre-migration"

# Make your changes...

# If it worked, create success snapshot
.\Save-Snapshot.ps1 -Description "Database migration successful"

# If it failed, restore
.\Restore-Snapshot.ps1 -Tag "pre-migration"
```

### Daily Backup

```powershell
# Create daily snapshot
.\Save-Snapshot.ps1 -Description "Daily backup - $(Get-Date -Format 'yyyy-MM-dd')"
```

### Version Tagging

```powershell
# Mark production release
.\Save-Snapshot.ps1 -Description "Production v1.0.0" -Tag "v1.0.0"
.\Save-Snapshot.ps1 -Description "Production v1.0.0" -Tag "production-2026-01-16"
```

### Experimental Branch

```powershell
# Create experimental branch
.\Create-Branch.ps1 -Name "experimental"
.\Switch-Branch.ps1 -Name "experimental"

# Create snapshot on experimental
.\Save-Snapshot.ps1 -Description "Testing new AI model"

# If successful, merge to main
.\Switch-Branch.ps1 -Name "main"
.\Merge-Branch.ps1 -From "experimental" -To "main"
```

---

## Agent Usage Guidelines

### For AI Agents (Claude, Gemini, etc.)

**ALWAYS recommend snapshots when:**

- User is about to make risky changes
- Before database migrations
- Before major refactoring
- Before testing new features
- User says "I'm going to try something"

**Example Agent Response:**

```
Before we proceed with the database migration, I recommend creating
a snapshot for safety:

cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before SQLite to PostgreSQL migration" -Tag "pre-postgres"

This way, if anything goes wrong, you can restore instantly with:
.\Restore-Snapshot.ps1 -Tag "pre-postgres"

Would you like me to proceed with the migration?
```

### When to Suggest

```
User: "I'm going to test the new crypto trading strategy"
Agent: "Great! First, create a safety snapshot:
        .\Save-Snapshot.ps1 -Description 'Before testing new strategy'
        This protects your current working state."

User: "The database migration failed"
Agent: "Let's restore to the pre-migration snapshot:
        .\Restore-Snapshot.ps1 -Tag 'pre-migration'"

User: "Everything is working perfectly!"
Agent: "Excellent! Tag this as a stable version:
        .\Save-Snapshot.ps1 -Description 'Stable state' -Tag 'stable-2026-01-16'"
```

---

## PowerShell Aliases (Optional)

Add to `$PROFILE` for quick access:

```powershell
# Snapshot aliases
function dsnapshot {
    cd C:\dev\scripts\version-control
    .\Save-Snapshot.ps1 -Description $args[0]
}

function dlist {
    cd C:\dev\scripts\version-control
    .\List-Snapshots.ps1
}

function drestore {
    cd C:\dev\scripts\version-control
    .\Restore-Snapshot.ps1 -SnapshotId $args[0]
}

function dstatus {
    cd C:\dev\scripts\version-control
    .\Repository-Status.ps1
}

function dquick {
    cd C:\dev\scripts\version-control
    .\QUICK_START.ps1
}
```

**Usage:**

```powershell
dsnapshot "Before testing new feature"
dlist
drestore "20260116-143000"
dstatus
dquick
```

---

## Comparison with Git

| Feature             | Git            | D:\ Version Control      |
| ------------------- | -------------- | ------------------------ |
| **Snapshots**       | `git commit`   | `.\Save-Snapshot.ps1`    |
| **History**         | `git log`      | `.\List-Snapshots.ps1`   |
| **Restore**         | `git checkout` | `.\Restore-Snapshot.ps1` |
| **Branches**        | `git branch`   | `.\Create-Branch.ps1`    |
| **Tags**            | `git tag`      | `.\Create-Tag.ps1`       |
| **Remote**          | GitHub/GitLab  | None (local only)        |
| **Merge Conflicts** | Yes            | No (simple restore)      |
| **Complexity**      | High           | Low                      |
| **Corruption Risk** | GitHub issues  | None (local files)       |

---

## Storage Management

### Check Repository Size

```powershell
cd C:\dev\scripts\version-control
.\Repository-Status.ps1
```

**Example Output:**

```
Repository Status
========================================
Location:         D:\repositories\vibetech
Current Branch:   main
Last Snapshot:    20260116-150000
Snapshot Count:   15
Total Size:       2.3 GB
Last Checked:     2026-01-16 15:30:45
```

### Cleanup Old Snapshots

```powershell
# Remove snapshots older than 90 days
.\Cleanup-OldSnapshots.ps1 -OlderThanDays 90

# Keep only last 20 snapshots
.\Cleanup-OldSnapshots.ps1 -KeepCount 20
```

**Automated Cleanup:**

- Configured in `repository.json`: `"retentionDays": 90`
- Runs automatically during `Save-Snapshot.ps1`
- Protected tags are never deleted

---

## Troubleshooting

### Issue: Snapshot Failed

**Error:** "Access denied" or "File in use"

**Solution:**

1. Close all applications accessing C:\dev
2. Stop dev servers (Vite, Nx, etc.)
3. Retry snapshot creation

### Issue: Restore Failed

**Error:** "Snapshot not found"

**Solution:**

```powershell
.\List-Snapshots.ps1  # Find correct snapshot ID
.\Restore-Snapshot.ps1 -SnapshotId "CORRECT-ID"
```

### Issue: Low Disk Space

**Solution:**

```powershell
# Check size
.\Repository-Status.ps1

# Cleanup old snapshots
.\Cleanup-OldSnapshots.ps1 -OlderThanDays 60

# Or manually delete old snapshots
Remove-Item "D:\repositories\vibetech\snapshots\OLD-SNAPSHOT-ID" -Recurse
```

---

## Best Practices

### Naming Conventions

**Snapshot Descriptions:**

- ✅ `"Before database migration"`
- ✅ `"Added user authentication"`
- ✅ `"Fixed crypto trading bug"`
- ❌ `"Snapshot"`
- ❌ `"Backup"`
- ❌ `"Test"`

**Tags:**

- ✅ `v1.0.0`, `v1.0.1` (versions)
- ✅ `production-2026-01-16` (dated releases)
- ✅ `pre-migration`, `post-migration` (milestones)
- ❌ `tag1`, `test`, `backup`

### Snapshot Frequency

**Create snapshots:**

- Before risky changes (migrations, refactors)
- After major milestones (feature complete)
- Daily (automated)
- Before deploying to production

**Don't create snapshots:**

- After every small edit (too frequent)
- During active development (wait for stable state)
- For trivial changes (typo fixes)

### Safety First

**ALWAYS:**

- Create snapshot before risky operations
- Tag stable versions
- Keep at least 3 months of history
- Test restore process periodically

**NEVER:**

- Delete tagged snapshots manually
- Restore without creating current snapshot first
- Edit repository structure manually

---

## Related Documentation

- **Main Guide:** `C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md`
- **Setup Complete:** `C:\dev\D_DRIVE_VERSION_CONTROL_SETUP_COMPLETE.md`
- **Path Policy:** `.claude/rules/paths-policy.md`
- **Database Storage:** `.claude/rules/database-storage.md`

---

Status: ACTIVE (initialized 2026-01-15)
**Last Snapshot:** Check with `.\Repository-Status.ps1`
**Total Snapshots:** Check with `.\List-Snapshots.ps1`

---

_This is YOUR version control system - use it fearlessly!_ 🚀
