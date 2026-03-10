# Database Backup - Quick Reference Card

## 🚀 Setup (One-Time)

```powershell
# Run as Administrator
cd C:\dev\scripts
.\setup-backup-schedule.ps1
```

---

## 📦 Manual Backup

```powershell
# Standard backup
.\database-backup.ps1

# With custom retention
.\database-backup.ps1 -RetentionDays 90

# Fast backup (skip verification)
.\database-backup.ps1 -SkipVerification
```

---

## 🔄 Restore Database

```powershell
# List available backups
Get-ChildItem D:\backups\database-backups -Directory | Sort-Object -Descending

# Dry run (preview only)
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DryRun

# Restore single database
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DatabaseName trading.db

# Restore all databases
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -Force
```

---

## 🔍 Monitor Health

```powershell
# Quick check
.\monitor-backups.ps1

# Detailed analysis
.\monitor-backups.ps1 -Detailed
```

---

## 📋 View Logs

```powershell
# Latest backup log
Get-ChildItem D:\backups\database-backups -Filter "backup_log_*.txt" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content -Tail 50

# Search for errors
Get-ChildItem D:\backups\database-backups -Filter "backup_log_*.txt" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5 |
    Select-String "\[ERROR\]"
```

---

## 🔧 Manage Scheduled Tasks

```powershell
# View status
Get-ScheduledTask | Where-Object TaskName -like "Database-Backup-*" | Get-ScheduledTaskInfo

# Run task manually
Start-ScheduledTask -TaskName "Database-Backup-Daily"

# Disable task
Disable-ScheduledTask -TaskName "Database-Backup-Daily"

# Enable task
Enable-ScheduledTask -TaskName "Database-Backup-Daily"

# Open Task Scheduler GUI
taskschd.msc
```

---

## 📊 Check Disk Space

```powershell
# D:\ drive info
Get-PSDrive D | Select-Object Used, Free, @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}

# Backup directory size
Get-ChildItem D:\backups\database-backups -Recurse |
    Measure-Object -Property Length -Sum |
    Select-Object @{Name="SizeGB";Expression={[math]::Round($_.Sum/1GB,2)}}
```

---

## 🧪 Test Backup Integrity

```powershell
# Extract and verify
$latest = Get-ChildItem D:\backups\database-backups -Directory | Sort-Object -Descending | Select-Object -First 1
$tempDir = "$env:TEMP\backup-test"
7z x "$($latest.FullName)\trading.db.7z" -o"$tempDir" -y
sqlite3 "$tempDir\trading.db" "PRAGMA integrity_check;"
Remove-Item $tempDir -Recurse -Force
```

---

## 🆘 Emergency Recovery

```powershell
# Restore latest backup immediately
$latest = Get-ChildItem D:\backups\database-backups -Directory | Sort-Object -Descending | Select-Object -First 1
.\database-restore.ps1 -BackupTimestamp $latest.Name -Force
```

---

## 📍 Key Locations

- **Backup Scripts:** `C:\dev\scripts\database-backup.ps1`
- **Restore Script:** `C:\dev\scripts\database-restore.ps1`
- **Monitor Script:** `C:\dev\scripts\monitor-backups.ps1`
- **Backups:** `D:\backups\database-backups\`
- **Logs:** `D:\backups\database-backups\backup_log_*.txt`
- **Full Guide:** `C:\dev\docs\DATABASE_BACKUP_GUIDE.md`

---

## ⏰ Automated Schedule

| Task | Frequency | Time | Purpose |
|------|-----------|------|---------|
| Daily Full Backup | Daily | 2:00 AM | Standard backup |
| Weekly Verification | Weekly (Sunday) | 3:00 AM | Test restore |
| Health Monitor | Every 6 hours | Continuous | Alert on issues |
| Pre-Shutdown | Before restart | On event | Emergency backup |

---

**Need Help?** See full documentation: `C:\dev\docs\DATABASE_BACKUP_GUIDE.md`
