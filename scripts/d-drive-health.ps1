#Requires -Version 5.1
<#
.SYNOPSIS
    Unified D: drive health dashboard.
.DESCRIPTION
    Checks disk space, database health, log sizes, learning-system staleness,
    and backup retention in a single pass. Outputs JSON and console summary.
.PARAMETER OutputPath
    Path for the JSON report. Default: D:\logs\d-drive-health\YYYY-MM-DD.json
.PARAMETER LogThresholdMB
    Threshold for flagging a log directory as runaway. Default: 100
.PARAMETER LearningStaleDays
    Threshold for flagging stale learning-system files. Default: 30
.EXAMPLE
    .\d-drive-health.ps1
    .\d-drive-health.ps1 -LogThresholdMB 200 -LearningStaleDays 7
#>

[CmdletBinding()]
param(
    [string]$OutputPath = (Join-Path 'D:\logs\d-drive-health' ("$(Get-Date -Format 'yyyy-MM-dd').json")),
    [int]$LogThresholdMB = 100,
    [int]$LearningStaleDays = 30
)

$ErrorActionPreference = 'Continue'
$ReportDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null }

function Write-Status {
    param([string]$Label, [string]$Status, [string]$Detail = '')
    $color = switch ($Status) {
        'OK'    { 'Green' }
        'WARN'  { 'Yellow' }
        'FAIL'  { 'Red' }
        default { 'White' }
    }
    Write-Host "  [$Status] $Label" -ForegroundColor $color -NoNewline
    if ($Detail) { Write-Host " ($Detail)" -ForegroundColor DarkGray }
    else { Write-Host }
}

# 1. Disk Space
$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='D:'"
$freeGB  = [math]::Round($d.FreeSpace / 1GB, 2)
$totalGB = [math]::Round($d.Size / 1GB, 2)
$usedPct = [math]::Round((($d.Size - $d.FreeSpace) / $d.Size) * 100, 1)
$diskStatus = if ($usedPct -gt 90) { 'FAIL' } elseif ($usedPct -gt 75) { 'WARN' } else { 'OK' }

Write-Host "`nD: Drive Health Check" -ForegroundColor Cyan
Write-Status "Disk space" $diskStatus "$freeGB GB free of $totalGB GB ($usedPct% used)"

# 2. Database Health (delegate to existing script)
$dbHealthJson = Join-Path $env:TEMP "db-health-$(Get-Date -Format 'yyyyMMddHHmmss').json"
$dbHealthStatus = 'SKIPPED'
$dbSummary = @{ total = 0; core = 0; duplicates = 0; largeWals = 0 }

try {
    $scriptPath = Join-Path $PSScriptRoot 'database-health.ps1'
    if (Test-Path $scriptPath) {
        & $scriptPath -OutputPath $dbHealthJson | Out-Null
        $dbReport = Get-Content $dbHealthJson -Raw | ConvertFrom-Json
        $dbSummary.total = $dbReport.summary.totalDatabases
        $dbSummary.core = $dbReport.summary.coreDatabases
        $dbSummary.duplicates = $dbReport.summary.duplicateNameGroups
        $dbSummary.largeWals = $dbReport.summary.largeWalFiles
        $dbHealthStatus = if ($dbReport.summary.duplicateNameGroups -gt 0 -or $dbReport.summary.largeWalFiles -gt 0) { 'WARN' } else { 'OK' }
        Remove-Item $dbHealthJson -ErrorAction SilentlyContinue
    }
} catch {
    $dbHealthStatus = 'FAIL'
}
Write-Status "Database health" $dbHealthStatus "$($dbSummary.total) dbs, $($dbSummary.duplicates) dupes, $($dbSummary.largeWals) large WALs"

# 3. Logs
$logDirs = Get-ChildItem 'D:\logs' -Directory -ErrorAction SilentlyContinue
$logIssues = @()
foreach ($dir in $logDirs) {
    $sizeMB = [math]::Round((Get-ChildItem $dir.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    if ($sizeMB -gt $LogThresholdMB) {
        $logIssues += @{ name = $dir.Name; sizeMB = $sizeMB }
    }
}
$logStatus = if ($logIssues.Count -gt 0) { 'WARN' } else { 'OK' }
Write-Status "Log directories" $logStatus "$($logIssues.Count) dirs > ${LogThresholdMB}MB"

# 4. Learning System
$learningRoot = 'D:\learning-system'
$staleFiles = @()
if (Test-Path $learningRoot) {
    $cutoff = (Get-Date).AddDays(-$LearningStaleDays)
    $staleFiles = Get-ChildItem $learningRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff -and $_.Extension -in @('.log','.json','.db','.md') }
}
$learningStatus = if ($staleFiles.Count -gt 10) { 'WARN' } elseif ($staleFiles.Count -gt 0) { 'OK' } else { 'OK' }
Write-Status "Learning system" $learningStatus "$($staleFiles.Count) stale files > ${LearningStaleDays}d"

# 5. Backups
function Get-OldestSubdirInfo {
    param([string]$Root)
    if (-not (Test-Path $Root)) { return $null }
    $dirs = @(Get-ChildItem $Root -Directory -ErrorAction SilentlyContinue)
    if ($dirs.Count -eq 0) { return $null }
    return [pscustomobject]@{
        count  = $dirs.Count
        oldest = ($dirs | Sort-Object CreationTime | Select-Object -First 1).CreationTime
    }
}

$backupRoot = 'D:\backups'
$snapshotRepoRoot = 'D:\repositories\vibetech'
$backupStatus = 'OK'
$backupCount = 0
$backupOldest = $null
$backupSource = $backupRoot

$primaryBackups = Get-OldestSubdirInfo -Root $backupRoot
if ($primaryBackups) {
    $backupCount = $primaryBackups.count
    $backupOldest = $primaryBackups.oldest
}

if ($backupCount -eq 0) {
    # No dated backup dirs under D:\backups — fall back to the D:\ snapshot
    # version-control repo (see .claude/rules/d-drive-version-control.md).
    $snapshotSearchRoot = if (Test-Path (Join-Path $snapshotRepoRoot 'snapshots')) {
        Join-Path $snapshotRepoRoot 'snapshots'
    } else {
        $snapshotRepoRoot
    }
    $fallbackSnapshots = Get-OldestSubdirInfo -Root $snapshotSearchRoot
    if ($fallbackSnapshots) {
        $backupCount = $fallbackSnapshots.count
        $backupOldest = $fallbackSnapshots.oldest
        $backupSource = $snapshotSearchRoot
    } elseif (Test-Path (Join-Path $snapshotRepoRoot '.git')) {
        $commitDate = git -C $snapshotRepoRoot log -1 --format=%cI 2>$null
        if ($commitDate) {
            $backupCount = 1
            $backupOldest = [datetime]$commitDate
            $backupSource = "$snapshotRepoRoot (git)"
        }
    }
}

if ($backupCount -gt 0 -and $backupOldest) {
    $daysOld = [math]::Round(((Get-Date) - $backupOldest).TotalDays, 1)
    if ($daysOld -gt 14) { $backupStatus = 'WARN' }
    Write-Status "Backups" $backupStatus "$backupCount snapshots ($backupSource), oldest ${daysOld}d"
} else {
    Write-Status "Backups" "OK" "no backup snapshots found"
}

# Build report
$report = [ordered]@{
    generatedAt = (Get-Date -Format 'o')
    disk = [ordered]@{
        status = $diskStatus
        freeGB = $freeGB
        totalGB = $totalGB
        usedPct = $usedPct
    }
    databases = [ordered]@{
        status = $dbHealthStatus
        summary = $dbSummary
    }
    logs = [ordered]@{
        status = $logStatus
        thresholdMB = $LogThresholdMB
        runawayDirs = $logIssues
    }
    learningSystem = [ordered]@{
        status = $learningStatus
        staleDays = $LearningStaleDays
        staleFileCount = $staleFiles.Count
    }
    backups = [ordered]@{
        status = $backupStatus
        count = $backupCount
    }
}

$report | ConvertTo-Json -Depth 6 | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "`nReport: $OutputPath" -ForegroundColor DarkGray
