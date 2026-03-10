# Database Backup System - Quick Reference

**Last Updated:** 2026-01-19
**Status:** Production Ready ✅

---

## Overview

The database backup system consists of two scripts:

1. **`Run-DatabaseBackup.ps1`** - Visual wrapper with "Second Brain Preservation" branding
2. **`database-backup.ps1`** - Robust engine with SQLite WAL support

---

## Quick Start

### Automated (Non-Interactive)

```powershell
cd C:\dev\admin_scripts
.\Run-DatabaseBackup.ps1
```

This runs silently and exits automatically - perfect for scheduled tasks.

### Interactive (Visual Feedback)

```powershell
.\Run-DatabaseBackup.ps1 -Interactive
```

Shows the full "Second Brain Preservation" experience with pause at end.

---

## Features

### ✅ SQLite WAL Mode Support

- Automatically detects and backs up `.db-wal` and `.db-shm` files
- Uses safe SQLite `.backup` command (not file copy)
- Includes all files in compressed archive

### ✅ Maintenance Log Integration

- Writes summary to `D:\databases\maintenance.log`
- Unified tracking across all database operations
- Includes backup status, size, and retention info

### ✅ Smart Compression

- Uses 7-Zip (if available) for maximum compression
- Falls back to .NET Compress-Archive
- Typical compression: 60-80% size reduction

### ✅ Integrity Verification

- Pre-backup integrity check (can skip with `-SkipVerification`)
- Post-backup recovery test on random sample
- Ensures backups are restorable

### ✅ Automatic Retention

- Default: 365 days (1 year)
- Configurable via `-RetentionDays` parameter
- Automatically removes old backups

---

## Directory Structure

```
D:\backups\database-backups\
├── 20260119_143022\          # Timestamp-based folders
│   ├── trading.db.7z         # Compressed backups
│   ├── database.db.7z
│   └── vibe-tutor.db.7z
├── 20260118_143015\
└── backup_log_20260119_143022.txt  # Detailed logs
```

---

## Critical Databases Backed Up

- `D:\databases\trading.db` - Crypto trading system
- `D:\databases\database.db` - Unified database (IconForge, etc.)
- `D:\databases\vibe-tutor.db` - Educational platform
- `D:\databases\vibe_justice.db` - Legal AI system
- `D:\databases\vibe_studio.db` - Code studio
- `D:\databases\agent_learning.db` - Learning system
- `D:\databases\nova\nova_memory.db` - Nova memory
- `D:\databases\task-registry\*.db` - Task registries

---

## Advanced Usage

### Test the System

```powershell
cd C:\dev\admin_scripts
.\Test-DatabaseBackup.ps1
```

Performs comprehensive verification without modifying data.

### Custom Retention

```powershell
# Keep backups for 90 days instead of 365
.\Run-DatabaseBackup.ps1 -Interactive
# OR directly:
cd C:\dev\scripts
.\database-backup.ps1 -RetentionDays 90
```

### Skip Verification (Faster)

```powershell
cd C:\dev\scripts
.\database-backup.ps1 -SkipVerification
```

### Incremental Backup (Future)

```powershell
cd C:\dev\scripts
.\database-backup.ps1 -BackupType Incremental
```

---

## Scheduled Automation

### Option 1: Task Scheduler

Create a Windows Task Scheduler task:

```xml
Action: Start a program
Program: powershell.exe
Arguments: -ExecutionPolicy Bypass -File "C:\dev\admin_scripts\Run-DatabaseBackup.ps1"
Trigger: Daily at 2:00 AM
```

### Option 2: PowerShell Script

```powershell
# Add to your startup script
$trigger = New-JobTrigger -Daily -At "2:00 AM"
$job = Register-ScheduledJob -Name "DatabaseBackup" `
    -FilePath "C:\dev\admin_scripts\Run-DatabaseBackup.ps1" `
    -Trigger $trigger
```

---

## Maintenance Log Format

Location: `D:\databases\maintenance.log`

```
[2026-01-19 14:30:22] DATABASE BACKUP - SUCCESS
  Total: 8 | Success: 8 | Failed: 0
  Size: 1.24 GB
  Location: D:\backups\database-backups\20260119_143022
  Type: Full | Retention: 365 days

[2026-01-18 14:30:15] DATABASE BACKUP - SUCCESS
  Total: 8 | Success: 8 | Failed: 0
  Size: 1.22 GB
  Location: D:\backups\database-backups\20260118_143015
  Type: Full | Retention: 365 days
```

---

## Troubleshooting

### Issue: "sqlite3 command not found"

**Solution:**

1. Download SQLite Tools from <https://www.sqlite.org/download.html>
2. Extract `sqlite3.exe` to a folder in PATH (e.g., `C:\Program Files\SQLite\`)
3. Or place in `C:\Windows\System32\`

### Issue: "Database locked"

**Solution:**

- Close all applications using the database
- The `.backup` command handles most lock scenarios automatically
- If persistent, add delay: `Start-Sleep -Seconds 5` before backup

### Issue: "Not enough disk space"

**Solution:**

```powershell
# Check available space
Get-PSDrive D

# Reduce retention to free space
.\database-backup.ps1 -RetentionDays 30
```

### Issue: "Backup verification failed"

**Solution:**

- Check the log file: `D:\backups\database-backups\backup_log_*.txt`
- Run integrity check manually: `sqlite3 database.db "PRAGMA integrity_check;"`
- Contact support if corruption detected

---

## Recovery Procedure

### Step 1: Locate Backup

```powershell
cd D:\backups\database-backups
Get-ChildItem -Directory | Sort-Object Name -Descending | Select-Object -First 5
```

### Step 2: Extract

```powershell
# Using 7-Zip
7z x D:\backups\database-backups\20260119_143022\trading.db.7z

# Using PowerShell
Expand-Archive -Path "trading.db.zip" -DestinationPath "C:\temp\restore"
```

### Step 3: Restore

```powershell
# Stop services using the database first!
Stop-Service MyService  # Example

# Replace database
Copy-Item "C:\temp\restore\trading.db" -Destination "D:\databases\trading.db" -Force

# Restart services
Start-Service MyService
```

---

## Performance Metrics

**Typical Backup Times (SSD):**

- Small DB (<10MB): ~5 seconds
- Medium DB (10-100MB): ~15 seconds
- Large DB (100MB-1GB): ~1-2 minutes
- Very Large DB (>1GB): ~5-10 minutes

**Compression Ratios:**

- 7-Zip (mx=9): 70-85% reduction
- .NET ZIP: 60-75% reduction

**Storage Requirements:**

- Daily backups: ~1.5 GB/day (compressed)
- 365 days retention: ~550 GB/year
- Recommended D:\ drive size: 1TB+

---

## Related Scripts

- `scripts/database-backup.ps1` - Core backup engine
- `scripts/auto-backup-monitor.ps1` - Monitor backup status
- `scripts/monitor-backups.ps1` - Backup health checks
- `scripts/setup-backup-schedule.ps1` - Configure Task Scheduler

---

## Changelog

### 2026-01-19 - WAL Mode & Maintenance Log

- ✅ Added SQLite WAL file handling (`.db-wal`, `.db-shm`)
- ✅ Integrated `D:\databases\maintenance.log` tracking
- ✅ Improved compression to include all database files
- ✅ Non-interactive by default with `-Interactive` option

### Previous

- Migrated from Desktop to `C:\dev\admin_scripts`
- Refactored for automation
- Added visual "Second Brain Preservation" wrapper

---

**Support:** Review logs in `D:\backups\database-backups\` for detailed diagnostics.