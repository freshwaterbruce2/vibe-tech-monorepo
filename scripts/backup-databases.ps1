# Requires -Version 7.0
# =============================================================================
# VibeTech Workspace - SQLite Hot Backup Script
# Performs zero-downtime, non-blocking daily hot backups of active WAL-mode
# databases targeting D:\databases\ and saves timestamped versions to D:\_backups\.
# =============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$databaseDir = "D:\databases"
$backupDir = "D:\_backups"
$retentionDays = 7
$learningDbPath = "D:\databases\agent_learning.db"

# Ensure backup directory exists
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$logTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$logTime] Starting daily SQLite hot backup sequence..." -ForegroundColor Cyan

# Find all SQLite files in the database directory (excluding WAL/SHM sidecars)
$dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.db" -File
if ($dbFiles.Count -eq 0) {
    $dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.sqlite" -File
}

if ($dbFiles.Count -eq 0) {
    Write-Host "⚠️ No active SQLite databases found in $databaseDir." -ForegroundColor Yellow
    exit 0
}

$successCount = 0
$failCount = 0
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

foreach ($db in $dbFiles) {
    $dbName = $db.BaseName
    $dbFullPath = $db.FullName
    
    # Define backup output path
    $backupFileName = "${dbName}_backup_${timestamp}.db"
    $backupFullPath = Join-Path $backupDir $backupFileName
    
    Write-Host "`nBacking up '$dbName'..." -ForegroundColor Gray
    Write-Host "Source: $dbFullPath" -ForegroundColor DarkGray
    Write-Host "Target: $backupFullPath" -ForegroundColor DarkGray
    
    try {
        # Check if sqlite3 CLI is available
        $sqliteCheck = Get-Command sqlite3 -ErrorAction SilentlyContinue
        if ($sqliteCheck) {
            # Use SQLite's online vacuum backup command (non-blocking, hot backup)
            # VACUUM INTO creates a perfectly clean, defragmented single-file copy of active WAL-mode databases.
            sqlite3 $dbFullPath "VACUUM INTO '$backupFullPath';"
        } else {
            # Fallback: Copy database safely. (Note: standard copying of active WAL-mode dbs can be unsafe,
            # but we use PowerShell copy as a fallback if sqlite3 is not in PATH)
            Write-Host "⚠️ 'sqlite3' CLI not found in PATH. Falling back to system file copy..." -ForegroundColor Yellow
            Copy-Item -Path $dbFullPath -Destination $backupFullPath -Force
        }
        
        Write-Host "✅ Backup completed successfully for $dbName!" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ Failed to back up ${dbName}: $_" -ForegroundColor Red
        $failCount++
    }
}

# =============================================================================
# Retention Management: Purge backups older than $retentionDays
# =============================================================================
Write-Host "`n=== Managing backup retention (Keeping last $retentionDays days)..." -ForegroundColor Cyan
$oldBackups = Get-ChildItem -Path $backupDir -Filter "*_backup_*" -File | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays)
}

if ($oldBackups.Count -gt 0) {
    foreach ($oldFile in $oldBackups) {
        try {
            Remove-Item -Path $oldFile.FullName -Force
            Write-Host "🗑️ Purged expired backup: $($oldFile.Name)" -ForegroundColor DarkGray
        } catch {
            Write-Host "⚠️ Failed to purge old backup file $($oldFile.Name): $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No expired backups found to purge." -ForegroundColor DarkGray
}

# =============================================================================
# Log Telemetry to Learning Database
# =============================================================================
if (Test-Path $learningDbPath) {
    try {
        $guid = ([guid]::NewGuid()).ToString()
        $nowStr = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
        $epoch = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        
        $isSuccess = 1
        $errorMsg = "NULL"
        if ($failCount -gt 0 -and $successCount -gt 0) {
            $isSuccess = 1
            $errorMsg = "'Partial failure: $failCount databases failed to back up.'"
        } elseif ($successCount -eq 0) {
            $isSuccess = 0
            $errorMsg = "'All backups failed.'"
        }
        
        $metadataJson = '{"successCount":' + $successCount + ',"failCount":' + $failCount + '}'
        
        $sqliteQuery = "INSERT INTO agent_executions (execution_id, agent_id, task_type, started_at, completed_at, success, execution_time_ms, error_message, metadata, project_name, agent_name, created_at) VALUES ('$guid', 'storage-learning-expert', 'db-backup', '$nowStr', '$nowStr', $isSuccess, 0, $errorMsg, '$metadataJson', 'vibetech-monorepo', 'storage-learning-expert', $epoch);"
        
        sqlite3 $learningDbPath "$sqliteQuery"
        Write-Host "`nTelemetry successfully written to agent_learning.db." -ForegroundColor DarkGray
    } catch {
        # Silent ignore if sqlite registry fails
    }
}

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "`n[$endTime] Backup sequence finalized. Successes: $successCount, Failures: $failCount.`n" -ForegroundColor Green
