# D:\ Drive Version Control Scripts

**Your Personal Local "GitHub" Without Git**

---

## Quick Start

```powershell
# Run the interactive menu
.\QUICK_START.ps1
```

This will guide you through:

1. Creating snapshots (like `git commit`)
2. Viewing snapshot history (like `git log`)
3. Restoring snapshots (like `git checkout`)
4. Repository status

---

## Available Scripts

### Core Operations

- **`QUICK_START.ps1`** - Interactive menu (easiest way to use)
- **`Initialize-LocalRepo.ps1`** - One-time setup (already done)
- **`Save-Snapshot.ps1`** - Create snapshot with description
- **`List-Snapshots.ps1`** - View all snapshots
- **`Restore-Snapshot.ps1`** - Restore from snapshot

### Advanced Operations

- **`Create-Branch.ps1`** - Create new branch
- **`Switch-Branch.ps1`** - Switch to different branch
- **`List-Branches.ps1`** - View all branches
- **`Merge-Branch.ps1`** - Merge branches
- **`Create-Tag.ps1`** - Tag snapshot (e.g., v1.0.0)
- **`List-Tags.ps1`** - View all tags
- **`Compare-Snapshots.ps1`** - Compare two snapshots
- **`Show-History.ps1`** - View detailed history
- **`Repository-Status.ps1`** - Check repository status
- **`Cleanup-OldSnapshots.ps1`** - Remove old snapshots

---

## Common Commands

### Create Snapshot (Like Git Commit)

```powershell
.\Save-Snapshot.ps1 -Description "Before database migration"
.\Save-Snapshot.ps1 -Description "Production ready" -Tag "v1.0.0"
```

### List Snapshots (Like Git Log)

```powershell
.\List-Snapshots.ps1              # All snapshots
.\List-Snapshots.ps1 -Limit 10    # Last 10
```

### Restore Snapshot (Like Git Checkout)

```powershell
.\Restore-Snapshot.ps1 -SnapshotId "20260116-143000"
.\Restore-Snapshot.ps1 -Tag "v1.0.0"
```

### Repository Status

```powershell
.\Repository-Status.ps1
```

**Output:**

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

---

## Repository Structure

```
D:\repositories\vibetech\
├── snapshots\               # Compressed workspace snapshots
│   ├── 20260116-140000\
│   ├── 20260116-143000\
│   └── 20260116-150000\
├── branches\                # Branch metadata
│   ├── main\
│   └── feature-ai-upgrade\
├── tags\                    # Named snapshots
│   ├── v1.0.0\
│   └── production\
├── metadata\                # Additional metadata
├── logs\                    # Change history
│   └── CHANGELOG.md
└── .config\                 # Configuration
    ├── repository.json
    ├── status.json
    └── exclude.txt
```

---

## Documentation

### Main Documentation

- **Complete Guide:** `C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md`
- **Setup Complete:** `C:\dev\D_DRIVE_VERSION_CONTROL_SETUP_COMPLETE.md`
- **Rule File:** `C:\dev\.claude\rules\d-drive-version-control.md`

### Quick Reference

- **Commands:** `C:\dev\.claude\rules\commands-reference.md`
- **CLAUDE.md:** Section on D:\ version control
- **Global Context:** `C:\dev\.claude\context\global.md`

---

## When to Use

**Create snapshots before:**

- Database migrations
- Major refactoring
- Testing risky changes
- Destructive operations
- Deploying to production

**Example Workflow:**

```powershell
# Before risky change
.\Save-Snapshot.ps1 -Description "Before migration" -Tag "pre-migration"

# Make your changes...

# If it worked
.\Save-Snapshot.ps1 -Description "Migration successful"

# If it failed
.\Restore-Snapshot.ps1 -Tag "pre-migration"
```

---

## PowerShell Aliases (Optional)

Add to `$PROFILE` for quick access:

```powershell
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
dquick
```

---

## Benefits

✅ **No Git/GitHub** - Completely local, no corruption risk
✅ **Simple** - PowerShell scripts you can understand
✅ **Fast Restore** - Just copy files back
✅ **Compression** - 97% smaller (2 GB → 64 MB)
✅ **Safe** - Auto-backup before restore
✅ **Flexible** - Branches, tags, full history

---

## Status

- **Repository:** `D:\repositories\vibetech`
- **Workspace:** `C:\dev`
- **Current Branch:** `main`
- **Initialized:** 2026-01-15 11:15:30
- **Status:** ACTIVE

---

**Need Help?** Run `.\QUICK_START.ps1` for interactive guidance!
