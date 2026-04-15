# D:\ Drive Version Control System

Priority: MANDATORY
Repository: `D:\repositories\vibetech`
Scripts: `C:\dev\scripts\version-control\`

## When to Use

Create a snapshot BEFORE: database migrations, major refactoring, destructive operations, testing risky changes, or any "I'm going to try something" moment. Use GitHub (C:\dev) for code version control — this system is for D:\ data snapshots only.

## Commands

```powershell
# Create snapshot
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before database migration"
.\Save-Snapshot.ps1 -Description "Production ready" -Tag "v1.0.0"

# List snapshots
.\List-Snapshots.ps1
.\List-Snapshots.ps1 -Limit 10

# Restore snapshot
.\Restore-Snapshot.ps1 -SnapshotId "20260116-143000"
.\Restore-Snapshot.ps1 -Tag "v1.0.0"

# Cleanup (use Quick-Cleanup for weekly, Emergency-Cleanup for deep)
.\tools\scripts\Quick-Cleanup.ps1
.\tools\scripts\Emergency-Cleanup.ps1
```

## Tags

```powershell
.\Save-Snapshot.ps1 -Description "Before migration" -Tag "pre-migration"
.\Restore-Snapshot.ps1 -Tag "pre-migration"
```

Snapshots are compressed ~97% (2 GB -> 64 MB). Excludes `node_modules/`, `dist/`, `.nx/`.
