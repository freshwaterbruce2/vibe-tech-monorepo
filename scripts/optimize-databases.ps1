# Automated Database Optimization Script
# Optimizes all databases in D:\databases\

param(
    [switch]$DryRun,
    [switch]$Verbose,
    [string[]]$Projects = @()
)

$ErrorActionPreference = "Continue"
$optimizationLog = "D:\logs\database-optimization\optimization-$(Get-Date -Format 'yyyy-MM-dd').log"

New-Item -ItemType Directory -Path (Split-Path $optimizationLog) -Force | Out-Null

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $optimizationLog -Value $logMessage
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { if ($Verbose) { Write-Host $logMessage } }
    }
}

Write-Log "Starting database optimization" "INFO"
Write-Log "Dry Run: $DryRun" "INFO"

$stats = @{
    Total = 0
    Optimized = 0
    Skipped = 0
    Errors = 0
    SpaceReclaimed = 0
}

$databases = if ($Projects.Count -gt 0) {
    $Projects | ForEach-Object {
        Get-ChildItem "D:\databases\$_" -Recurse -Filter *.db -ErrorAction SilentlyContinue
    }
} else {
    Get-ChildItem "D:\databases" -Recurse -Filter *.db -ErrorAction SilentlyContinue
}

foreach ($db in $databases) {
    $stats.Total++
    $dbName = $db.Name
    $dbPath = $db.FullName
    $sizeBefore = $db.Length
    
    Write-Log "Processing: $dbName" "INFO"
    
    try {
        # Integrity check
        $integrityResult = sqlite3 $dbPath "PRAGMA integrity_check;" 2>&1
        
        if ($integrityResult -ne "ok") {
            Write-Log "  INTEGRITY CHECK FAILED: $integrityResult" "ERROR"
            $stats.Errors++
            continue
        }
        
        # Check/enable WAL mode
        $walMode = sqlite3 $dbPath "PRAGMA journal_mode;" 2>&1
        if ($walMode -ne "wal") {
            Write-Log "  Enabling WAL mode (was: $walMode)" "WARN"
            if (-not $DryRun) {
                sqlite3 $dbPath "PRAGMA journal_mode=WAL;" | Out-Null
            }
        }
        
        # Check fragmentation
        $pageCount = sqlite3 $dbPath "PRAGMA page_count;" 2>&1
        $freePages = sqlite3 $dbPath "PRAGMA freelist_count;" 2>&1
        $fragmentationPct = if ($pageCount -gt 0) { 
            [math]::Round(($freePages / $pageCount) * 100, 2) 
        } else { 0 }
        
        Write-Log "  Fragmentation: ${fragmentationPct}% ($freePages free pages)" "INFO"
        
        # Run ANALYZE
        if (-not $DryRun) {
            Write-Log "  Running ANALYZE..." "INFO"
            sqlite3 $dbPath "ANALYZE;" 2>&1 | Out-Null
        }
        
        # Run VACUUM if needed
        if ($fragmentationPct -gt 5 -or $freePages -gt 100) {
            if (-not $DryRun) {
                Write-Log "  Running VACUUM..." "INFO"
                sqlite3 $dbPath "VACUUM;" 2>&1 | Out-Null
                
                $dbInfo = Get-Item $dbPath
                $sizeAfter = $dbInfo.Length
                $spaceReclaimed = $sizeBefore - $sizeAfter
                $stats.SpaceReclaimed += $spaceReclaimed
                
                $reclaimedKB = [math]::Round($spaceReclaimed / 1KB, 2)
                Write-Log "  Space reclaimed: $reclaimedKB KB" "SUCCESS"
            }
        } else {
            Write-Log "  VACUUM not needed" "INFO"
            $stats.Skipped++
        }
        
        $stats.Optimized++
        
    } catch {
        Write-Log "  ERROR: $($_.Exception.Message)" "ERROR"
        $stats.Errors++
    }
}

Write-Log "=== Summary ===" "INFO"
Write-Log "Total: $($stats.Total), Optimized: $($stats.Optimized), Skipped: $($stats.Skipped), Errors: $($stats.Errors)" "INFO"
$totalReclaimedMB = [math]::Round($stats.SpaceReclaimed / 1MB, 2)
Write-Log "Space reclaimed: $totalReclaimedMB MB" "SUCCESS"

return $stats
