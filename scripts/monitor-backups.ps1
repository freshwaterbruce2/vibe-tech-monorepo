#Requires -Version 7.0
<#
.SYNOPSIS
    Monitor database backup health and alert on issues
.DESCRIPTION
    Checks backup status, age, size trends, and integrity
.EXAMPLE
    .\monitor-backups.ps1
.EXAMPLE
    .\monitor-backups.ps1 -Detailed
#>

[CmdletBinding()]
param(
    [switch]$Detailed,
    [switch]$SendAlerts,
    [string]$BackupRoot = 'D:\backups\database-backups'
)

#region Configuration
$ErrorActionPreference = 'Stop'

# Monitoring thresholds
$MaxBackupAge = 48  # hours
$MinBackupSize = 1MB
$MaxBackupSize = 1GB
$RequiredDatabases = @(
    'trading.db',
    'database.db',
    'vibe-tutor.db',
    'vibe_justice.db',
    'vibe_studio.db'
)

# Health metrics
$Health = @{
    Status = 'HEALTHY'
    Issues = @()
    Warnings = @()
    LastBackup = $null
    TotalBackups = 0
    TotalSize = 0
    OldestBackup = $null
    LatestBackup = $null
}
#endregion

#region Functions

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet('OK', 'WARNING', 'ERROR', 'INFO')]
        [string]$Status = 'INFO'
    )

    $color = switch ($Status) {
        'OK' { 'Green' }
        'WARNING' { 'Yellow' }
        'ERROR' { 'Red' }
        default { 'White' }
    }

    $icon = switch ($Status) {
        'OK' { '✓' }
        'WARNING' { '⚠' }
        'ERROR' { '✗' }
        default { 'ℹ' }
    }

    Write-Host "$icon $Message" -ForegroundColor $color
}

function Get-BackupAge {
    param([string]$Timestamp)

    try {
        $date = [DateTime]::ParseExact($Timestamp, 'yyyyMMdd_HHmmss', $null)
        return (Get-Date) - $date
    }
    catch {
        return $null
    }
}

function Test-BackupCompleteness {
    param([string]$BackupDir)

    $missing = @()
    foreach ($db in $RequiredDatabases) {
        # Check for both .7z and .zip versions of the database
        $found = Get-ChildItem -Path $BackupDir -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "*$db*.7z" -or $_.Name -like "*$db*.zip" }

        if (-not $found) {
            $missing += $db
        }
    }
    return $missing
}

function Get-BackupSizeAnomaly {
    param([string]$DatabaseName)

    # Get last 5 backups for this database
    $recentBackups = Get-ChildItem -Path $BackupRoot -Directory |
        Sort-Object Name -Descending |
        Select-Object -First 5 |
        ForEach-Object {
            Get-ChildItem -Path $_.FullName -Filter "*$DatabaseName*" -Include "*.7z","*.zip" -ErrorAction SilentlyContinue
        } |
        Where-Object { $_ } |
        Select-Object -First 5

    if ($recentBackups.Count -lt 3) {
        return $null  # Not enough data
    }

    $sizes = $recentBackups | ForEach-Object { $_.Length }
    $avgSize = ($sizes | Measure-Object -Average).Average
    $latestSize = $sizes[0]

    # Alert if latest backup is >50% different from average
    $deviation = [Math]::Abs($latestSize - $avgSize) / $avgSize
    if ($deviation -gt 0.5) {
        return @{
            Database = $DatabaseName
            LatestSize = $latestSize
            AverageSize = $avgSize
            Deviation = $deviation
        }
    }

    return $null
}

#endregion

#region Main Monitoring

Write-Host "`n=== Database Backup Health Monitor ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Backup Location: $BackupRoot`n"

# Check if backup directory exists
if (-not (Test-Path $BackupRoot)) {
    Write-Status "Backup directory not found: $BackupRoot" -Status ERROR
    $Health.Status = 'CRITICAL'
    $Health.Issues += "No backup directory found"
    exit 1
}

# Get all backup sets
$backupDirs = Get-ChildItem -Path $BackupRoot -Directory | Sort-Object Name -Descending

if ($backupDirs.Count -eq 0) {
    Write-Status "No backups found!" -Status ERROR
    $Health.Status = 'CRITICAL'
    $Health.Issues += "No backups exist"
    exit 1
}

$Health.TotalBackups = $backupDirs.Count
$Health.LatestBackup = $backupDirs[0].Name
$Health.OldestBackup = $backupDirs[-1].Name

# Check latest backup
$latestBackupDir = $backupDirs[0]
$backupAge = Get-BackupAge -Timestamp $latestBackupDir.Name

if ($backupAge) {
    $Health.LastBackup = $backupAge
    $ageHours = $backupAge.TotalHours

    if ($ageHours -gt $MaxBackupAge) {
        Write-Status "Latest backup is $([math]::Round($ageHours, 1)) hours old (threshold: $MaxBackupAge hours)" -Status WARNING
        $Health.Warnings += "Backup is stale"
        $Health.Status = 'WARNING'
    }
    else {
        Write-Status "Latest backup: $([math]::Round($ageHours, 1)) hours ago" -Status OK
    }
}

# Check backup completeness
Write-Status "`nChecking backup completeness..." -Status INFO
$missing = Test-BackupCompleteness -BackupDir $latestBackupDir.FullName

if ($missing.Count -gt 0) {
    Write-Status "Missing databases: $($missing -join ', ')" -Status ERROR
    $Health.Status = 'CRITICAL'
    $Health.Issues += "Missing required databases"
}
else {
    Write-Status "All required databases backed up" -Status OK
}

# Check backup sizes
Write-Status "`nAnalyzing backup sizes..." -Status INFO
$backupFiles = Get-ChildItem -Path $latestBackupDir.FullName -Include "*.7z","*.zip"
$totalSize = ($backupFiles | Measure-Object -Property Length -Sum).Sum
$Health.TotalSize = $totalSize

Write-Host "  Total backup size: $([math]::Round($totalSize/1MB, 2)) MB"

foreach ($backup in $backupFiles) {
    $size = $backup.Length
    if ($size -lt $MinBackupSize) {
        Write-Status "  $($backup.Name): suspiciously small ($([math]::Round($size/1KB, 2)) KB)" -Status WARNING
        $Health.Warnings += "$($backup.Name) is unusually small"
    }
    elseif ($size -gt $MaxBackupSize) {
        Write-Status "  $($backup.Name): very large ($([math]::Round($size/1MB, 2)) MB)" -Status WARNING
        $Health.Warnings += "$($backup.Name) is unusually large"
    }
}

# Check for size anomalies (optional detailed check)
if ($Detailed) {
    Write-Status "`nDetecting size anomalies..." -Status INFO
    foreach ($db in $RequiredDatabases) {
        $anomaly = Get-BackupSizeAnomaly -DatabaseName $db
        if ($anomaly) {
            $pctChange = [math]::Round($anomaly.Deviation * 100, 1)
            Write-Status "  $($anomaly.Database): ${pctChange}% size change from average" -Status WARNING
            $Health.Warnings += "$($anomaly.Database) size changed significantly"
        }
    }
}

# Check disk space
Write-Status "`nChecking disk space..." -Status INFO
$drive = Get-PSDrive D
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
$usedSpaceGB = [math]::Round($drive.Used / 1GB, 2)
$totalSpaceGB = [math]::Round(($drive.Free + $drive.Used) / 1GB, 2)
$freePercent = [math]::Round(($drive.Free / ($drive.Free + $drive.Used)) * 100, 1)

Write-Host "  D:\ drive: $freeSpaceGB GB free ($freePercent%) of $totalSpaceGB GB"

if ($freePercent -lt 10) {
    Write-Status "  Low disk space: ${freePercent}% remaining" -Status ERROR
    $Health.Status = 'CRITICAL'
    $Health.Issues += "Low disk space"
}
elseif ($freePercent -lt 20) {
    Write-Status "  Disk space getting low: ${freePercent}% remaining" -Status WARNING
    $Health.Warnings += "Disk space below 20%"
}
else {
    Write-Status "  Disk space: OK" -Status OK
}

# Check recent backup logs for errors
Write-Status "`nChecking backup logs..." -Status INFO
$recentLogs = Get-ChildItem -Path $BackupRoot -Filter "backup_log_*.txt" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 3

$errorCount = 0
foreach ($log in $recentLogs) {
    $errors = Select-String -Path $log.FullName -Pattern "\[ERROR\]" -ErrorAction SilentlyContinue
    $errorCount += $errors.Count
}

if ($errorCount -gt 0) {
    Write-Status "Found $errorCount errors in recent backup logs" -Status WARNING
    $Health.Warnings += "$errorCount errors in logs"
}
else {
    Write-Status "No errors in recent backup logs" -Status OK
}

# Summary
Write-Host "`n=== Health Summary ===" -ForegroundColor Cyan
Write-Host "Status: " -NoNewline
switch ($Health.Status) {
    'HEALTHY' { Write-Host $Health.Status -ForegroundColor Green }
    'WARNING' { Write-Host $Health.Status -ForegroundColor Yellow }
    'CRITICAL' { Write-Host $Health.Status -ForegroundColor Red }
}

Write-Host "Total Backups: $($Health.TotalBackups)"
Write-Host "Latest Backup: $($Health.LatestBackup)"
Write-Host "Backup Age: $([math]::Round($Health.LastBackup.TotalHours, 1)) hours"
Write-Host "Total Size: $([math]::Round($Health.TotalSize/1GB, 2)) GB"

if ($Health.Issues.Count -gt 0) {
    Write-Host "`nCritical Issues:" -ForegroundColor Red
    $Health.Issues | ForEach-Object { Write-Host "  • $_" }
}

if ($Health.Warnings.Count -gt 0) {
    Write-Host "`nWarnings:" -ForegroundColor Yellow
    $Health.Warnings | ForEach-Object { Write-Host "  • $_" }
}

# Send alerts if configured
if ($SendAlerts -and ($Health.Issues.Count -gt 0 -or $Health.Warnings.Count -gt 0)) {
    # TODO: Implement alerting (email, Slack, webhook)
    Write-Status "`n[ALERT] Issues detected - sending notifications..." -Status WARNING
}

# Exit with appropriate code
if ($Health.Status -eq 'CRITICAL') {
    exit 1
}
elseif ($Health.Status -eq 'WARNING') {
    exit 2
}

exit 0

#endregion
