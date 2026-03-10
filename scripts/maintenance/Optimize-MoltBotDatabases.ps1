#!/usr/bin/env powershell
<#
.SYNOPSIS
    Optimize MoltBot SQLite databases for performance

.DESCRIPTION
    Performs VACUUM, ANALYZE, and integrity checks on all MoltBot databases
    Reclaims unused space, updates statistics, and ensures database health
    Should be run monthly or after large data operations

.PARAMETER DatabaseName
    Specific database to optimize, or "All" for all databases

.PARAMETER SkipBackup
    Skip creating backup before optimization (not recommended)

.EXAMPLE
    .\Optimize-MoltBotDatabases.ps1 -DatabaseName All
    Optimize all databases with safety backup

.EXAMPLE
    .\Optimize-MoltBotDatabases.ps1 -DatabaseName agent_learning
    Optimize only agent_learning database

.EXAMPLE
    .\Optimize-MoltBotDatabases.ps1 -DatabaseName All -SkipBackup
    Optimize all databases without backup (faster, riskier)
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("All", "trading", "agent_learning", "learning", "logging_analytics", "monitoring", "events")]
    [string]$DatabaseName,

    [switch]$SkipBackup = $false
)

# Database locations
$databases = @{
    "trading" = "D:\databases\trading.db"
    "agent_learning" = "D:\learning-system\agent_learning.db"
    "learning" = "D:\learning-system\learning.db"
    "logging_analytics" = "D:\learning-system\logging_analytics.db"
    "monitoring" = "D:\learning-system\monitoring.db"
    "events" = "D:\learning-system\events.db"
}

# Check if sqlite3 is available
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3) {
    Write-Host "[ERROR] sqlite3 not found. Install SQLite to use this script." -ForegroundColor Red
    Write-Host "Download from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== MoltBot Database Optimization ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# Create backup unless skipped
if (-not $SkipBackup) {
    Write-Host "[SAFETY] Creating pre-optimization backup..." -ForegroundColor Yellow
    $backupScript = "C:\dev\scripts\backup\Backup-MoltBotData.ps1"

    if (Test-Path $backupScript) {
        try {
            & $backupScript -Compress | Out-Null
            Write-Host "  [OK] Safety backup created" -ForegroundColor Green
            Write-Host ""
        } catch {
            Write-Host "  [WARN] Backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
            $continue = Read-Host "Continue without backup? (y/n)"
            if ($continue -ne "y") {
                Write-Host "[ABORT] Optimization cancelled" -ForegroundColor Yellow
                exit 0
            }
        }
    } else {
        Write-Host "  [WARN] Backup script not found, continuing without backup" -ForegroundColor Yellow
    }
}

# Function to optimize database
function Optimize-Database {
    param([string]$dbPath, [string]$dbName)

    Write-Host "Optimizing $dbName..." -ForegroundColor Yellow

    if (-not (Test-Path $dbPath)) {
        Write-Host "  [WARN] Database not found: $dbPath" -ForegroundColor Yellow
        return $false
    }

    try {
        # Get size before optimization
        $sizeBefore = (Get-Item $dbPath).Length
        $sizeBeforeMB = [math]::Round($sizeBefore / 1MB, 2)

        # Step 1: Integrity check
        Write-Host "  [1/4] Integrity check..." -ForegroundColor Gray
        $integrityResult = & sqlite3 $dbPath "PRAGMA integrity_check;" 2>&1

        if ($integrityResult -ne "ok") {
            Write-Host "  [ERROR] Database corrupt. Run Repair-MoltBotDatabase.ps1 first" -ForegroundColor Red
            return $false
        }

        # Step 2: ANALYZE (update query planner statistics)
        Write-Host "  [2/4] Analyzing query statistics..." -ForegroundColor Gray
        & sqlite3 $dbPath "ANALYZE;" 2>&1 | Out-Null

        # Step 3: VACUUM (reclaim unused space, defragment)
        Write-Host "  [3/4] Vacuuming and defragmenting..." -ForegroundColor Gray
        & sqlite3 $dbPath "VACUUM;" 2>&1 | Out-Null

        # Step 4: Verify optimization
        Write-Host "  [4/4] Verifying optimization..." -ForegroundColor Gray
        $sizeAfter = (Get-Item $dbPath).Length
        $sizeAfterMB = [math]::Round($sizeAfter / 1MB, 2)
        $savedMB = [math]::Round(($sizeBefore - $sizeAfter) / 1MB, 2)
        $savedPercent = if ($sizeBefore -gt 0) {
            [math]::Round((($sizeBefore - $sizeAfter) / $sizeBefore) * 100, 1)
        } else { 0 }

        Write-Host "  [OK] Optimization complete" -ForegroundColor Green
        Write-Host "       Before: $sizeBeforeMB MB | After: $sizeAfterMB MB | Saved: $savedMB MB ($savedPercent%)" -ForegroundColor Gray

        return $true

    } catch {
        Write-Host "  [ERROR] Optimization failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main logic
$optimizedCount = 0
$failedCount = 0
$totalSavedMB = 0

# Determine which databases to optimize
$databasesToOptimize = if ($DatabaseName -eq "All") {
    $databases.Keys
} else {
    @($DatabaseName)
}

# Optimize each database
foreach ($dbName in $databasesToOptimize) {
    $dbPath = $databases[$dbName]
    $sizeBefore = if (Test-Path $dbPath) { (Get-Item $dbPath).Length } else { 0 }

    $success = Optimize-Database -dbPath $dbPath -dbName $dbName

    if ($success) {
        $optimizedCount++
        $sizeAfter = if (Test-Path $dbPath) { (Get-Item $dbPath).Length } else { 0 }
        $totalSavedMB += [math]::Round(($sizeBefore - $sizeAfter) / 1MB, 2)
    } else {
        $failedCount++
    }

    Write-Host ""
}

# Summary
Write-Host "=== Optimization Summary ===" -ForegroundColor Cyan
Write-Host "Databases Optimized: $optimizedCount"
Write-Host "Failed: $failedCount"
Write-Host "Total Space Saved: $totalSavedMB MB"
Write-Host ""

# Recommendations
if ($optimizedCount -gt 0) {
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "  - Run optimization monthly or after large data operations"
    Write-Host "  - Monitor database sizes: Get-ChildItem D:\learning-system\*.db"
    Write-Host "  - Check query performance after optimization"
    Write-Host "  - Schedule with: Register-MaintenanceTask.ps1"
    Write-Host ""
}

if ($failedCount -gt 0) {
    Write-Host "[WARN] Some databases failed optimization" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] All databases optimized successfully" -ForegroundColor Green
    exit 0
}
