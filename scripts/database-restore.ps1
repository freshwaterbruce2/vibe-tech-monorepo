#Requires -Version 7.0
<#
.SYNOPSIS
    Restore SQLite databases from backup
.DESCRIPTION
    Safely restores databases from compressed backups with verification
.PARAMETER BackupTimestamp
    Timestamp of backup to restore (format: yyyyMMdd_HHmmss)
.PARAMETER DatabaseName
    Specific database to restore (optional, restores all if not specified)
.PARAMETER RestoreLocation
    Where to restore databases (default: original location)
.PARAMETER DryRun
    Test restore without actually writing files
.EXAMPLE
    .\database-restore.ps1 -BackupTimestamp 20260114_120000 -DatabaseName trading.db
.EXAMPLE
    .\database-restore.ps1 -BackupTimestamp 20260114_120000 -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$BackupTimestamp,

    [string]$DatabaseName,

    [string]$RestoreLocation,

    [switch]$DryRun,

    [switch]$Force,

    [string]$BackupRoot = 'D:\backups\database-backups'
)

$ErrorActionPreference = 'Stop'

#region Functions

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogMessage -ForegroundColor $(
        switch ($Level) {
            'ERROR' { 'Red' }
            'WARN' { 'Yellow' }
            'SUCCESS' { 'Green' }
            default { 'White' }
        }
    )
}

function Test-DatabaseIntegrity {
    param([string]$DatabasePath)
    try {
        $result = & sqlite3 $DatabasePath "PRAGMA integrity_check;"
        return $result -eq "ok"
    }
    catch {
        return $false
    }
}

function Restore-Database {
    param(
        [string]$BackupPath,
        [string]$DestinationPath,
        [switch]$DryRun
    )

    Write-Log "Restoring: $(Split-Path $BackupPath -Leaf)"

    # Extract backup to temp location
    $tempDir = Join-Path $env:TEMP "restore-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        # Extract compressed backup
        if ($BackupPath -like "*.7z") {
            Write-Log "  Extracting 7z archive..."
            & 7z x $BackupPath -o"$tempDir" -y | Out-Null
        }
        elseif ($BackupPath -like "*.zip") {
            Write-Log "  Extracting zip archive..."
            Expand-Archive -Path $BackupPath -DestinationPath $tempDir -Force
        }
        else {
            throw "Unsupported backup format"
        }

        # Find extracted database
        $extractedDb = Get-ChildItem -Path $tempDir -Filter "*.db" | Select-Object -First 1
        if (-not $extractedDb) {
            throw "No database found in backup"
        }

        # Verify integrity
        Write-Log "  Verifying integrity..."
        if (-not (Test-DatabaseIntegrity -DatabasePath $extractedDb.FullName)) {
            throw "Backup integrity check failed"
        }
        Write-Log "  Integrity: OK" -Level 'SUCCESS'

        if ($DryRun) {
            Write-Log "  [DRY RUN] Would restore to: $DestinationPath" -Level 'WARN'
            return $true
        }

        # Backup existing database if it exists
        if (Test-Path $DestinationPath) {
            if (-not $Force) {
                $response = Read-Host "Database exists at $DestinationPath. Overwrite? (y/N)"
                if ($response -ne 'y') {
                    Write-Log "  Restore cancelled by user" -Level 'WARN'
                    return $false
                }
            }

            $backupExisting = "$DestinationPath.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
            Write-Log "  Backing up existing database to: $backupExisting"
            Copy-Item $DestinationPath $backupExisting -Force
        }

        # Restore database
        Write-Log "  Copying to: $DestinationPath"
        $destDir = Split-Path $DestinationPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $extractedDb.FullName $DestinationPath -Force

        # Final verification
        if (Test-DatabaseIntegrity -DatabasePath $DestinationPath) {
            Write-Log "  Restore completed successfully!" -Level 'SUCCESS'
            return $true
        }
        else {
            Write-Log "  Restore failed verification" -Level 'ERROR'
            return $false
        }
    }
    catch {
        Write-Log "  Restore failed: $_" -Level 'ERROR'
        return $false
    }
    finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Get-AvailableBackups {
    param([string]$BackupRoot)

    Write-Log "`nAvailable backups:"
    Get-ChildItem -Path $BackupRoot -Directory | Sort-Object Name -Descending | ForEach-Object {
        $backupCount = (Get-ChildItem -Path $_.FullName -Filter "*.7z","*.zip").Count
        $size = (Get-ChildItem -Path $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
        Write-Host "  $($_.Name): $backupCount databases, $([math]::Round($size/1MB, 2)) MB"
    }
}

#endregion

#region Main Execution

Write-Log "=== Database Restore Started ==="

# Validate backup exists
$backupDir = Join-Path $BackupRoot $BackupTimestamp
if (-not (Test-Path $backupDir)) {
    Write-Log "Backup not found: $backupDir" -Level 'ERROR'
    Write-Log "`nSearching for available backups..."
    Get-AvailableBackups -BackupRoot $BackupRoot
    exit 1
}

Write-Log "Backup location: $backupDir"

# Get backups to restore
$backupsToRestore = if ($DatabaseName) {
    Get-ChildItem -Path $backupDir -Filter "$DatabaseName*" -Include "*.7z","*.zip"
}
else {
    Get-ChildItem -Path $backupDir -Include "*.7z","*.zip"
}

if ($backupsToRestore.Count -eq 0) {
    Write-Log "No backups found matching criteria" -Level 'ERROR'
    exit 1
}

Write-Log "Found $($backupsToRestore.Count) backup(s) to restore"

# Restore each database
$successCount = 0
$failCount = 0

foreach ($backup in $backupsToRestore) {
    # Determine original location
    $dbName = $backup.BaseName -replace '\.(7z|zip)$', ''
    $originalPath = if ($RestoreLocation) {
        Join-Path $RestoreLocation $dbName
    }
    else {
        # Try to determine original location from common patterns
        switch -Regex ($dbName) {
            'trading' { "D:\databases\trading.db" }
            'database\.db' { "D:\databases\database.db" }
            'vibe-tutor' { "D:\databases\vibe-tutor.db" }
            'vibe_justice' { "D:\databases\vibe_justice.db" }
            'vibe_studio' { "D:\databases\vibe_studio.db" }
            'nova_memory' { "D:\databases\nova\nova_memory.db" }
            'agent_learning' { "D:\databases\agent_learning.db" }
            default { "D:\databases\$dbName" }
        }
    }

    if (Restore-Database -BackupPath $backup.FullName -DestinationPath $originalPath -DryRun:$DryRun) {
        $successCount++
    }
    else {
        $failCount++
    }
}

Write-Log "`n=== Restore Summary ==="
Write-Log "Successful: $successCount"
Write-Log "Failed: $failCount"

if ($DryRun) {
    Write-Log "`n[DRY RUN COMPLETE] No files were modified" -Level 'WARN'
}

if ($failCount -gt 0) {
    exit 1
}

#endregion
