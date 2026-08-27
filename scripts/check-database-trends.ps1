# Requires -Version 7.0
# =============================================================================
# VibeTech Workspace - Database Size Growth Trend Checker
# Compares current database sizes on D:\databases against a session baseline.
# Aborts/fails if any database has grown by more than 15% in the session.
# =============================================================================

$ErrorActionPreference = "Stop"

$databaseDir = "D:\databases"
$baselinePath = "D:\databases\.db_size_baseline.json"
$maxGrowthPercent = 15.0

if (-not (Test-Path $databaseDir)) {
    Write-Host "Database directory $databaseDir does not exist. Skipping trend check." -ForegroundColor Yellow
    exit 0
}

# Find all SQLite database files
$dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.db" -File
if ($dbFiles.Count -eq 0) {
    $dbFiles = Get-ChildItem -Path $databaseDir -Filter "*.sqlite" -File
}

if ($dbFiles.Count -eq 0) {
    Write-Host "No active databases found. Skipping trend check." -ForegroundColor Gray
    exit 0
}

# Gathers current database sizes
$currentSizes = [ordered]@{};
foreach ($db in $dbFiles) {
    $currentSizes[$db.Name] = $db.Length
}

# Load or initialize baseline
$baseline = $null
if (Test-Path $baselinePath) {
    try {
        $baseline = Get-Content -Raw -Path $baselinePath | ConvertFrom-Json
    } catch {
        Write-Host "⚠️ Warning: Failed to parse baseline file. Re-initializing baseline." -ForegroundColor Yellow
    }
}

if ($null -eq $baseline) {
    # Initialize baseline with current sizes
    $currentSizes | ConvertTo-Json -Depth 5 | Out-File -FilePath $baselinePath -Encoding utf8
    Write-Host "✅ Initialized database size baseline for this session at $baselinePath." -ForegroundColor Green
    exit 0
}

# Compare current sizes with baseline
$violationDetected = $false
$violations = @()
$updatedBaseline = [ordered]@{};

foreach ($dbName in $currentSizes.Keys) {
    $currentSize = $currentSizes[$dbName]
    
    # Check if baseline has the property representing this database
    $baselineSize = $null
    if ($baseline.PSObject.Properties[$dbName]) {
        $baselineSize = $baseline.$dbName
    }
    
    if ($null -ne $baselineSize) {
        $updatedBaseline[$dbName] = $baselineSize
        $growthBytes = $currentSize - $baselineSize
        $growthPercent = 0.0
        
        if ($baselineSize -gt 0) {
            $growthPercent = ($growthBytes / $baselineSize) * 100
        }
        
        if ($growthPercent -gt $maxGrowthPercent) {
            $violationDetected = $true
            $violations += [pscustomobject]@{
                Name = $dbName
                BaselineMB = [math]::Round($baselineSize / 1MB, 2)
                CurrentMB = [math]::Round($currentSize / 1MB, 2)
                GrowthMB = [math]::Round($growthBytes / 1MB, 2)
                GrowthPercent = [math]::Round($growthPercent, 2)
            }
        }
    } else {
        # New database added during session, initialize its baseline size
        $updatedBaseline[$dbName] = $currentSize
    }
}

# Save updated baseline (including any newly discovered databases)
$updatedBaseline | ConvertTo-Json -Depth 5 | Out-File -FilePath $baselinePath -Encoding utf8

# Report results
if ($violationDetected) {
    Write-Host "`n❌ CRITICAL: Database growth limit exceeded (> $maxGrowthPercent% growth in active session)!" -ForegroundColor Red
    foreach ($v in $violations) {
        Write-Host "  Database:      $($v.Name)" -ForegroundColor Red
        Write-Host "  Baseline Size: $($v.BaselineMB) MB" -ForegroundColor Red
        Write-Host "  Current Size:  $($v.CurrentMB) MB" -ForegroundColor Red
        Write-Host "  Growth:        +$($v.GrowthMB) MB ($($v.GrowthPercent)%)" -ForegroundColor Red
        Write-Host ""
    }
    Write-Host "Please vacuum the database or optimize writes before committing." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Database growth check passed. All databases within the $maxGrowthPercent% limit." -ForegroundColor Green
    exit 0
}
