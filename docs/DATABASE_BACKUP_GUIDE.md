# Database Backup & Recovery Guide

**Last Updated:** 2026-01-14
**Status:** Production Ready
**Platform:** Windows 11

---

## Overview

Comprehensive automated backup solution for all SQLite databases in the VibeTech monorepo.

**Features:**

- ✅ Automated daily backups
- ✅ Compression (7-Zip or ZIP)
- ✅ Integrity verification
- ✅ Automatic retention management
- ✅ Health monitoring
- ✅ Easy restore procedures
- ✅ Pre-shutdown emergency backups

---

## Quick Start

### 1. Setup Automated Backups

```powershell
# Run as Administrator
cd C:\dev\scripts
.\setup-backup-schedule.ps1
```

This creates 4 scheduled tasks:

- **Daily Full Backup** - 2:00 AM
- **Weekly Verification** - Sunday 3:00 AM
- **Health Monitor** - Every 6 hours
- **Pre-Shutdown** - Before system restart

### 2. Manual Backup

```powershell
# Full backup with 30-day retention
.\database-backup.ps1 -BackupType Full -RetentionDays 30

# Test backup without retention cleanup
.\database-backup.ps1 -BackupType Test -SkipVerification
```

### 3. Restore Database

```powershell
# List available backups
Get-ChildItem D:\backups\database-backups -Directory | Sort-Object -Descending | Select-Object -First 10

# Restore specific database (dry run first)
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DatabaseName trading.db -DryRun

# Restore all databases from backup
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -Force
```

### 4. Monitor Backup Health

```powershell
# Quick health check
.\monitor-backups.ps1

# Detailed analysis with size anomaly detection
.\monitor-backups.ps1 -Detailed
```

---

## Scripts Reference

### database-backup.ps1

**Purpose:** Automated SQLite backup with compression and verification

**Parameters:**

- `-BackupType` - Full, Incremental, or Test (default: Full)
- `-RetentionDays` - Days to keep backups (default: 30)
- `-SkipVerification` - Skip integrity checks (faster)
- `-UploadToCloud` - Reserved for cloud upload feature

**Critical Databases Backed Up:**

- `D:\databases\trading.db` - Crypto trading system
- `D:\databases\database.db` - Unified database (iconforge, etc.)
- `D:\databases\vibe-tutor.db` - Vibe-Tutor app
- `D:\databases\vibe_justice.db` - Legal AI system
- `D:\databases\vibe_studio.db` - Code studio
- `D:\databases\agent_learning.db` - Learning system
- `D:\databases\nova\nova_memory.db` - Nova memory
- `D:\databases\task-registry\*.db` - Task registries

**Backup Process:**

1. Verify database integrity (PRAGMA integrity_check)
2. Use SQLite `.backup` command (safest method)
3. Compress with 7-Zip (90%+ reduction) or ZIP
4. Verify compressed backup (random sample)
5. Remove backups older than retention period
6. Generate backup report

**Example Usage:**

```powershell
# Standard daily backup
.\database-backup.ps1

# Keep backups for 90 days
.\database-backup.ps1 -RetentionDays 90

# Fast backup without verification
.\database-backup.ps1 -SkipVerification
```

---

### database-restore.ps1

**Purpose:** Safe database restoration with verification

**Parameters:**

- `-BackupTimestamp` - Required: Backup to restore (format: yyyyMMdd_HHmmss)
- `-DatabaseName` - Optional: Specific database to restore
- `-RestoreLocation` - Optional: Custom restore location
- `-DryRun` - Test restore without writing files
- `-Force` - Skip confirmation prompts

**Restore Process:**

1. Validate backup exists
2. Extract compressed backup to temp location
3. Verify integrity of extracted database
4. Backup existing database (if exists)
5. Copy restored database to destination
6. Final integrity verification

**Example Usage:**

```powershell
# Dry run (safe preview)
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DryRun

# Restore single database
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DatabaseName trading.db

# Restore all databases to custom location
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -RestoreLocation D:\restore-test -Force
```

---

### setup-backup-schedule.ps1

**Purpose:** Configure Windows Task Scheduler for automation

**Requires:** Administrator privileges

**Creates 4 Scheduled Tasks:**

1. **Database-Backup-Daily**
   - Trigger: Daily at 2:00 AM
   - Action: Full backup with 30-day retention
   - User: SYSTEM (highest privileges)

2. **Database-Backup-WeeklyTest**
   - Trigger: Sunday at 3:00 AM
   - Action: Verification test
   - Purpose: Ensure backups are restorable

3. **Database-Backup-Monitor**
   - Trigger: Every 6 hours (starting 5 minutes after setup)
   - Action: Health monitoring
   - Purpose: Alert on issues

4. **Database-Backup-PreShutdown**
   - Trigger: System startup (before shutdown)
   - Action: Emergency backup
   - Purpose: Prevent data loss during unexpected shutdowns

**Example Usage:**

```powershell
# Run as Administrator
.\setup-backup-schedule.ps1

# Verify tasks created
Get-ScheduledTask | Where-Object TaskName -like "Database-Backup-*"

# View task details
Get-ScheduledTask -TaskName "Database-Backup-Daily" | Get-ScheduledTaskInfo
```

---

### monitor-backups.ps1

**Purpose:** Health monitoring and alerting

**Parameters:**

- `-Detailed` - Enable size anomaly detection
- `-SendAlerts` - Send notifications on issues (requires configuration)

**Health Checks:**

1. Backup age (alert if >48 hours old)
2. Backup completeness (all required databases)
3. Backup sizes (detect anomalies)
4. Disk space (warn if <20%, critical if <10%)
5. Recent backup logs (search for errors)

**Health Status:**

- `HEALTHY` - All checks passed (exit 0)
- `WARNING` - Non-critical issues detected (exit 2)
- `CRITICAL` - Major problems found (exit 1)

**Example Usage:**

```powershell
# Quick health check
.\monitor-backups.ps1

# Detailed analysis
.\monitor-backups.ps1 -Detailed

# With alerts (configure webhook/email first)
.\monitor-backups.ps1 -SendAlerts
```

---

## Directory Structure

```
D:\backups\database-backups\
├── 20260114_020000\              # Backup timestamp
│   ├── trading.db.7z             # Compressed backups
│   ├── database.db.7z
│   ├── vibe-tutor.db.7z
│   └── ...
├── 20260113_020000\              # Previous backup
│   └── ...
├── backup_log_20260114_020000.txt  # Backup logs
└── backup_log_20260113_020000.txt
```

---

## Recovery Procedures

### Scenario 1: Restore Latest Backup

```powershell
# Find latest backup
$latest = Get-ChildItem D:\backups\database-backups -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 1

# Restore all databases
.\database-restore.ps1 -BackupTimestamp $latest.Name -Force
```

### Scenario 2: Point-in-Time Recovery

```powershell
# List backups
Get-ChildItem D:\backups\database-backups -Directory | Sort-Object Name -Descending

# Restore specific timestamp
.\database-restore.ps1 -BackupTimestamp 20260110_020000 -Force
```

### Scenario 3: Partial Restore (Single Database)

```powershell
# Restore only trading database
.\database-restore.ps1 -BackupTimestamp 20260114_020000 -DatabaseName trading.db

# Restore to custom location for inspection
.\database-restore.ps1 -BackupTimestamp 20260114_020000 `
    -DatabaseName trading.db `
    -RestoreLocation D:\restore-test
```

### Scenario 4: Emergency Recovery (System Failure)

1. Boot into Windows Recovery Environment
2. Open Command Prompt
3. Navigate to backup directory:

   ```cmd
   cd D:\backups\database-backups
   dir /od
   ```

4. Extract backups manually:

   ```cmd
   "C:\Program Files\7-Zip\7z.exe" x trading.db.7z -oD:\databases\
   ```

5. Boot normally and verify databases

---

## Monitoring & Alerts

### Check Backup Status

```powershell
# View scheduled tasks
Get-ScheduledTask | Where-Object TaskName -like "Database-Backup-*" | Get-ScheduledTaskInfo

# View recent backup logs
Get-ChildItem D:\backups\database-backups -Filter "backup_log_*.txt" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content -Tail 50
```

### Setup Email Alerts (Optional)

Edit `monitor-backups.ps1` and add email configuration:

```powershell
if ($SendAlerts -and ($Health.Issues.Count -gt 0)) {
    Send-MailMessage `
        -From "backup@vibetech.local" `
        -To "admin@vibetech.local" `
        -Subject "Database Backup Alert: $($Health.Status)" `
        -Body ($Health.Issues -join "`n") `
        -SmtpServer "smtp.gmail.com" `
        -Port 587 `
        -UseSsl `
        -Credential (Get-Credential)
}
```

### Setup Slack Webhook (Optional)

```powershell
if ($SendAlerts -and ($Health.Issues.Count -gt 0)) {
    $webhook = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    $payload = @{
        text = "🚨 Database Backup Alert: $($Health.Status)"
        attachments = @(
            @{
                color = "danger"
                fields = @(
                    @{ title = "Issues"; value = ($Health.Issues -join "`n"); short = $false }
                )
            }
        )
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod -Uri $webhook -Method Post -Body $payload -ContentType 'application/json'
}
```

---

## Best Practices

### Backup Frequency

- **Daily Full Backups** - Standard for production
- **Incremental Backups** - Optional for high-change databases
- **Pre-Shutdown Backups** - Always enabled (emergency protection)

### Retention Policy

- **Development:** 7-14 days
- **Production:** 30-90 days
- **Compliance:** Check regulatory requirements (GDPR, HIPAA, etc.)

### Testing

- **Weekly:** Automated verification (scheduled task)
- **Monthly:** Manual restore test to isolated environment
- **Quarterly:** Full disaster recovery drill

### Security

- **Encryption at Rest:** Use BitLocker on D:\ drive
- **Access Control:** Limit backup directory permissions
- **Offsite Copies:** Copy to cloud storage (S3, Azure Blob, Google Drive)

### Performance

- **Schedule During Low Usage:** 2:00 AM typical
- **Use 7-Zip:** 90%+ compression (vs 50% with ZIP)
- **Verify Sample Only:** Check random backup instead of all

---

## Troubleshooting

### Issue: Backup Failed

**Check logs:**

```powershell
Get-ChildItem D:\backups\database-backups -Filter "backup_log_*.txt" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Select-String "\[ERROR\]"
```

**Common causes:**

- Database locked (app still running)
- Disk space full
- Permissions issue
- sqlite3 not in PATH

### Issue: Restore Failed

**Verify backup integrity:**

```powershell
# Extract to temp location
$tempDir = "$env:TEMP\backup-test"
7z x "D:\backups\database-backups\20260114_020000\trading.db.7z" -o"$tempDir"

# Check with sqlite3
sqlite3 "$tempDir\trading.db" "PRAGMA integrity_check;"
```

### Issue: Scheduled Task Not Running

**Check task status:**

```powershell
Get-ScheduledTask -TaskName "Database-Backup-Daily" | Get-ScheduledTaskInfo

# View task history
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" |
    Where-Object { $_.Message -like "*Database-Backup*" } |
    Select-Object -First 10
```

**Common fixes:**

- Verify PowerShell 7+ installed (`pwsh --version`)
- Check SYSTEM account has access to D:\
- Run task manually: `Start-ScheduledTask -TaskName "Database-Backup-Daily"`

### Issue: Compression Not Working

**Install 7-Zip:**

```powershell
# Using winget
winget install 7zip.7zip

# Or download from: https://www.7-zip.org/download.html
```

**Verify installation:**

```powershell
Get-Command 7z
```

If 7-Zip not found, script will fallback to ZIP compression (less efficient).

---

## Integration with Monorepo

### Pre-Commit Hook

Add backup check to `.git/hooks/pre-commit`:

```powershell
# Check if critical databases exist before committing
$criticalDbs = @(
    'D:\databases\trading.db',
    'D:\databases\database.db'
)

foreach ($db in $criticalDbs) {
    if (-not (Test-Path $db)) {
        Write-Host "ERROR: Critical database missing: $db" -ForegroundColor Red
        exit 1
    }
}
```

### CI/CD Integration

Add backup step to GitHub Actions:

```yaml
- name: Backup Databases
  if: github.ref == 'refs/heads/main'
  run: |
    pwsh -File C:\dev\scripts\database-backup.ps1 -BackupType Full
    pwsh -File C:\dev\scripts\monitor-backups.ps1 -Detailed
```

---

## Cloud Backup (Optional)

### Upload to AWS S3

```powershell
# Add to database-backup.ps1 after backup completes
if ($UploadToCloud) {
    aws s3 sync $BackupDir s3://vibetech-backups/databases/$Timestamp/ --storage-class GLACIER
}
```

### Upload to Azure Blob Storage

```powershell
if ($UploadToCloud) {
    az storage blob upload-batch `
        --destination vibetech-backups `
        --source $BackupDir `
        --account-name vibetechstorage
}
```

---

## Related Documentation

- **Path Policy:** `.claude/rules/paths-policy.md`
- **Database Storage:** `.claude/rules/database-storage.md`
- **Git Workflow:** `.claude/rules/git-workflow.md`

---

**Questions or Issues?**

- Check logs: `D:\backups\database-backups\backup_log_*.txt`
- Monitor health: `.\monitor-backups.ps1 -Detailed`
- Verify tasks: `Get-ScheduledTask | Where-Object TaskName -like "Database-Backup-*"`

---

*Last Updated: 2026-01-14*
*Status: Production Ready*
