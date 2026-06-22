# Requires -Version 7.0
# ==============================================================================
# VibeTech Workspace - SQLite Telemetry and Size Audit Utility
# Audits active databases in D:\databases\ against historical snapshots in D:\_backups\,
# calculates daily growth rates, projects 30-day size trends, and alerts on spikes.
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$databaseDir = "D:\databases"
$backupDir = "D:\_backups"
$learningDbPath = "D:\databases\agent_learning.db"
$growthThresholdPercent = 20.0   # Alert if DB grew >20% since last backup
$sizeAlertThresholdMB = 500.0    # Alert if DB exceeds 500MB
$daysWindow = 30

# Helper function for padding text (defined before use to prevent scoping errors)
function PSPad($text, $length) {
    $str = [string]$text
    if ($str.Length -ge $length) {
        return $str.Substring(0, $length)
    }
    return $str + (" " * ($length - $str.Length))
}

$logTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "[$logTime] Starting SQLite database size and growth audit..." -ForegroundColor Cyan

# Find active database files
$dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.db" -File
if ($dbFiles.Count -eq 0) {
    $dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.sqlite" -File
}

if ($dbFiles.Count -eq 0) {
    Write-Host "⚠️ No active SQLite databases found in $databaseDir." -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($dbFiles.Count) active databases. Scanning historical backups for trend analysis..." -ForegroundColor Gray

# Header for console output
$dashLine = "+" + ("-" * 22) + "+" + ("-" * 12) + "+" + ("-" * 12) + "+" + ("-" * 14) + "+" + ("-" * 14) + "+" + ("-" * 10) + "+"
Write-Host $dashLine -ForegroundColor Gray
Write-Host "| $(PSPad "Database Name" 20) | $(PSPad "Current (MB)" 10) | $(PSPad "Change (%)" 10) | $(PSPad "30-Day Proj" 12) | $(PSPad "Growth (MB/d)" 12) | $(PSPad "Status" 8) |" -ForegroundColor White
Write-Host $dashLine -ForegroundColor Gray

$alertsTriggered = @()
$totalSizeMB = 0
$telemetryRecords = @()

foreach ($db in $dbFiles) {
    $dbName = $db.BaseName
    $dbFullPath = $db.FullName
    $currentSizeMB = [Math]::Round(($db.Length / 1MB), 2)
    $totalSizeMB += $currentSizeMB

    # Find backups for this specific database
    $backups = Get-ChildItem -Path $backupDir -Filter "${dbName}_backup_*.db" -File | Where-Object {
        $_.LastWriteTime -ge (Get-Date).AddDays(-$daysWindow)
    } | Sort-Object LastWriteTime

    $changePercent = 0.0
    $growthRateMBPerDay = 0.0
    $projected30DayMB = $currentSizeMB
    $status = "OK"
    $statusColor = "Green"

    if ($backups.Count -gt 0) {
        # Last backup calculations
        $lastBackup = $backups[-1]
        $lastBackupSizeMB = [Math]::Round(($lastBackup.Length / 1MB), 2)
        
        if ($lastBackupSizeMB -gt 0) {
            $changePercent = [Math]::Round((($currentSizeMB - $lastBackupSizeMB) / $lastBackupSizeMB) * 100, 2)
        }

        # Multi-day trend if we have older backups
        $oldestBackup = $backups[0]
        $timeSpan = $db.LastWriteTime - $oldestBackup.LastWriteTime
        
        if ($timeSpan.TotalDays -gt 0.5) {
            $oldestSizeMB = ($oldestBackup.Length / 1MB)
            $totalGrowthMB = $currentSizeMB - $oldestSizeMB
            $growthRateMBPerDay = [Math]::Round(($totalGrowthMB / $timeSpan.TotalDays), 4)
            
            if ($growthRateMBPerDay -lt 0) { $growthRateMBPerDay = 0 } # Clip database shrink
            $projected30DayMB = [Math]::Round($currentSizeMB + ($growthRateMBPerDay * 30), 2)
        }
    }

    # Evaluate safety thresholds and alert parameters
    if ($currentSizeMB -gt $sizeAlertThresholdMB) {
        $status = "WARN_SZ"
        $statusColor = "Yellow"
        $alertsTriggered += "Database '$dbName' size ($currentSizeMB MB) exceeds alert threshold of $sizeAlertThresholdMB MB."
    }

    if ($changePercent -ge $growthThresholdPercent -and $currentSizeMB -gt 1.0) {
        $status = "SPIKE"
        $statusColor = "Red"
        $alertsTriggered += "Database '$dbName' grew by $changePercent% (current: $currentSizeMB MB) since its last backup, exceeding the $growthThresholdPercent% threshold."
    }

    # Output formatted row
    $pDbName = PSPad $dbName 20
    $pCurrentSize = PSPad "$currentSizeMB" 10
    $pChange = PSPad "$changePercent%" 10
    $pProjected = PSPad "$projected30DayMB" 12
    $pGrowth = PSPad "$growthRateMBPerDay" 12
    $pStatus = PSPad $status 8

    Write-Host "| $pDbName | $pCurrentSize | $pChange | $pProjected | $pGrowth | " -NoNewline -ForegroundColor Gray
    Write-Host $pStatus -NoNewline -ForegroundColor $statusColor
    Write-Host " |" -ForegroundColor Gray

    # Save details for unified logging
    $telemetryRecords += @{
        db_name = $dbName
        current_size_mb = $currentSizeMB
        change_pct = $changePercent
        growth_rate_day = $growthRateMBPerDay
        projected_size_mb = $projected30DayMB
        status = $status
    }
}

Write-Host $dashLine -ForegroundColor Gray
Write-Host "Total Managed Database Space: [ $totalSizeMB MB ]" -ForegroundColor Cyan

# Output alerts summary
if ($alertsTriggered.Count -gt 0) {
    Write-Host "`n🚨 TELEMETRY WARNINGS TRIGGERED:" -ForegroundColor Red
    foreach ($alert in $alertsTriggered) {
        Write-Host " - $alert" -ForegroundColor Red
    }
} else {
    Write-Host "`n✅ All databases are performing within safe growth and size parameters." -ForegroundColor Green
}

# ==============================================================================
# Write Consolidated Metrics to Learning Database
# ==============================================================================
if (Test-Path $learningDbPath) {
    try {
        $sqliteCheck = Get-Command sqlite3 -ErrorAction SilentlyContinue
        if ($sqliteCheck) {
            $guid = ([guid]::NewGuid()).ToString()
            $nowStr = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"
            $epoch = [DateTimeOffset]::Now.ToUnixTimeSeconds()
            
            # Format JSON summary payload using PowerShell basic formatting
            $jsonPayload = @()
            foreach ($rec in $telemetryRecords) {
                $jsonPayload += '{"db":"' + $rec.db_name + '","size":' + $rec.current_size_mb + ',"pct":' + $rec.change_pct + ',"trend":' + $rec.projected_size_mb + ',"status":"' + $rec.status + '"}'
            }
            $jsonString = "[" + ($jsonPayload -join ",") + "]"
            # Double single-quotes for SQLite safe strings
            $safeJsonString = $jsonString.Replace("'", "''")

            $isSuccess = 1
            $errorMsg = "NULL"
            if ($alertsTriggered.Count -gt 0) {
                $isSuccess = 1
                $errorMsg = "'" + ($alertsTriggered -join " | ").Replace("'", "''") + "'"
            }
            
            $sqliteQuery = "INSERT INTO agent_executions (execution_id, agent_id, task_type, started_at, completed_at, success, execution_time_ms, error_message, metadata, project_name, agent_name, created_at) VALUES ('$guid', 'storage-learning-expert', 'db-telemetry-audit', '$nowStr', '$nowStr', $isSuccess, 0, $errorMsg, '$safeJsonString', 'vibetech-monorepo', 'storage-learning-expert', $epoch);"
            
            # Execute queries natively via CLI
            sqlite3 $learningDbPath "$sqliteQuery"
            Write-Host "`nTelemetry metrics successfully synchronized with agent_learning.db." -ForegroundColor DarkGray
        }
    } catch {
        # Fail silently to avoid breaking execution if logging encounters locked DB
    }
}
Write-Host ""
