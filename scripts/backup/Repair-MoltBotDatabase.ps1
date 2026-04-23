#!/usr/bin/env powershell
<#
.SYNOPSIS
    Repair corrupted MoltBot SQLite databases

.DESCRIPTION
    Detects and repairs corrupted SQLite databases using integrity checks
    Falls back to latest backup if repair fails

.PARAMETER DatabaseName
    Name of database to repair (trading, agent_learning, learning, etc.)
    Use "All" to check all databases

.PARAMETER AutoRestore
    Automatically restore from backup if corruption detected

.EXAMPLE
    .\Repair-MoltBotDatabase.ps1 -DatabaseName agent_learning
    Check and repair agent_learning.db

.EXAMPLE
    .\Repair-MoltBotDatabase.ps1 -DatabaseName All
    Check all databases for corruption

.EXAMPLE
    .\Repair-MoltBotDatabase.ps1 -DatabaseName trading -AutoRestore
    Check trading.db and auto-restore from backup if corrupted
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("All", "trading", "agent_learning", "memory", "nova_activity", "agent_tasks", "feature_flags", "database", "learning", "logging_analytics", "monitoring", "events")]
    [string]$DatabaseName,

    [switch]$AutoRestore = $false
)

# Database locations
$databases = @{
    "trading" = "D:\databases\trading.db"
    "agent_learning" = "D:\databases\agent_learning.db"
    "memory" = "D:\databases\memory.db"
    "nova_activity" = "D:\databases\nova_activity.db"
    "agent_tasks" = "D:\databases\agent_tasks.db"
    "feature_flags" = "D:\databases\feature_flags.db"
    "database" = "D:\databases\database.db"
}

$retiredDatabases = @{
    "learning" = "Retired placeholder. Do not recreate; remove any stale references instead."
    "logging_analytics" = "Retired learning-system database. Keep backup history only."
    "monitoring" = "Retired database name. Reconcile consumers against D:\databases\DB_INVENTORY.md instead of restoring it."
    "events" = "No live events database is currently inventoried. Do not recreate it from stale automation assumptions."
}

# Check if sqlite3 is available
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3) {
    Write-Host "[ERROR] sqlite3 not found. Install SQLite to use this script." -ForegroundColor Red
    Write-Host "Download from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== MoltBot Database Repair ===" -ForegroundColor Cyan
Write-Host ""

if ($DatabaseName -ne "All" -and $retiredDatabases.ContainsKey($DatabaseName)) {
    Write-Host "[WARN] $DatabaseName is retired. $($retiredDatabases[$DatabaseName])" -ForegroundColor Yellow
    exit 1
}

# Function to check database integrity
function Test-DatabaseIntegrity {
    param([string]$dbPath, [string]$dbName)

    Write-Host "Checking $dbName..." -ForegroundColor Yellow

    if (-not (Test-Path $dbPath)) {
        Write-Host "  [WARN] Database not found: $dbPath" -ForegroundColor Yellow
        return $false
    }

    try {
        # Run integrity check
        $result = & sqlite3 $dbPath "PRAGMA integrity_check;" 2>&1

        if ($result -eq "ok") {
            Write-Host "  [OK] Database is healthy" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  [CORRUPT] Database integrity check failed:" -ForegroundColor Red
            Write-Host "  $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  [ERROR] Failed to check database: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to attempt database repair
function Repair-Database {
    param([string]$dbPath, [string]$dbName)

    Write-Host "`nAttempting repair of $dbName..." -ForegroundColor Yellow

    $backupPath = "$dbPath.corrupt.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

    try {
        # Backup corrupted database
        Copy-Item $dbPath $backupPath -Force
        Write-Host "  [OK] Corrupted database backed up to: $backupPath" -ForegroundColor Green

        # Attempt to dump and recreate
        $dumpPath = "$dbPath.dump"
        Write-Host "  [REPAIR] Attempting to dump database..." -ForegroundColor Yellow

        $dumpResult = & sqlite3 $dbPath ".dump" 2>&1 | Out-File $dumpPath -Encoding UTF8

        if (Test-Path $dumpPath) {
            # Recreate database from dump
            $newDbPath = "$dbPath.new"
            & sqlite3 $newDbPath < $dumpPath 2>&1 | Out-Null

            # Verify new database
            $verifyResult = & sqlite3 $newDbPath "PRAGMA integrity_check;" 2>&1

            if ($verifyResult -eq "ok") {
                # Replace old database with new one
                Remove-Item $dbPath -Force
                Move-Item $newDbPath $dbPath -Force
                Remove-Item $dumpPath -Force

                Write-Host "  [OK] Database repaired successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  [FAIL] Repaired database still corrupted" -ForegroundColor Red
                Remove-Item $newDbPath -Force -ErrorAction SilentlyContinue
                Remove-Item $dumpPath -Force -ErrorAction SilentlyContinue
                return $false
            }
        } else {
            Write-Host "  [FAIL] Could not dump database" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  [ERROR] Repair failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to restore from backup
function Restore-FromBackup {
    param([string]$dbName)

    Write-Host "`nRestoring $dbName from backup..." -ForegroundColor Yellow

    # Find latest backup
    $backupDir = "D:\backups\moltbot"
    if (-not (Test-Path $backupDir)) {
        Write-Host "  [ERROR] Backup directory not found: $backupDir" -ForegroundColor Red
        return $false
    }

    $latestBackup = Get-ChildItem $backupDir -Filter "*.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestBackup) {
        Write-Host "  [ERROR] No backups found in $backupDir" -ForegroundColor Red
        return $false
    }

    Write-Host "  [INFO] Latest backup: $($latestBackup.Name)" -ForegroundColor Cyan

    # Use restore script
    $restoreScript = Join-Path $PSScriptRoot "Restore-MoltBotBackup.ps1"
    if (-not (Test-Path $restoreScript)) {
        Write-Host "  [ERROR] Restore script not found: $restoreScript" -ForegroundColor Red
        return $false
    }

    try {
        & $restoreScript -BackupFile $latestBackup.FullName -RestoreMode Databases -SkipBackup
        Write-Host "  [OK] Database restored from backup" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [ERROR] Restore failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main logic
$corruptedDatabases = @()
$repairedDatabases = @()
$failedDatabases = @()

# Determine which databases to check
$databasesToCheck = if ($DatabaseName -eq "All") {
    $databases.Keys
} else {
    @($DatabaseName)
}

# Check each database
foreach ($dbName in $databasesToCheck) {
    $dbPath = $databases[$dbName]

    $isHealthy = Test-DatabaseIntegrity -dbPath $dbPath -dbName $dbName

    if (-not $isHealthy) {
        $corruptedDatabases += $dbName

        # Attempt repair
        $repairSuccess = Repair-Database -dbPath $dbPath -dbName $dbName

        if ($repairSuccess) {
            $repairedDatabases += $dbName
        } else {
            # Repair failed, try restore from backup
            if ($AutoRestore) {
                $restoreSuccess = Restore-FromBackup -dbName $dbName

                if ($restoreSuccess) {
                    $repairedDatabases += $dbName
                } else {
                    $failedDatabases += $dbName
                }
            } else {
                Write-Host "`n  [ACTION] Run with -AutoRestore to restore from backup" -ForegroundColor Yellow
                $failedDatabases += $dbName
            }
        }
    }

    Write-Host ""
}

# Summary
Write-Host "=== Repair Summary ===" -ForegroundColor Cyan
Write-Host "Databases Checked: $($databasesToCheck.Count)"
Write-Host "Corrupted: $($corruptedDatabases.Count)"
Write-Host "Repaired: $($repairedDatabases.Count)"
Write-Host "Failed: $($failedDatabases.Count)"
Write-Host ""

if ($failedDatabases.Count -gt 0) {
    Write-Host "[WARN] The following databases could not be repaired:" -ForegroundColor Yellow
    foreach ($db in $failedDatabases) {
        Write-Host "  - $db" -ForegroundColor Yellow
    }
    Write-Host "`nManual intervention required. Check corrupted backups:" -ForegroundColor Yellow
    foreach ($db in $failedDatabases) {
        $dbPath = $databases[$db]
        $backupPattern = "$dbPath.corrupt.*"
        Write-Host "  $backupPattern" -ForegroundColor Gray
    }
    exit 1
} elseif ($corruptedDatabases.Count -gt 0) {
    Write-Host "[OK] All corrupted databases were repaired" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[OK] All databases are healthy" -ForegroundColor Green
    exit 0
}
