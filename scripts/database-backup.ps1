#Requires -Version 7.0
<#
.SYNOPSIS
    Automated SQLite database backup with compression and rotation
.DESCRIPTION
    Backs up all critical SQLite databases from D:\databases to D:\backups
    with compression, verification, and automatic retention management.
.PARAMETER BackupType
    Type of backup: Full (default), Incremental, or Test
.PARAMETER RetentionDays
    Number of days to keep backups (default: 30)
.EXAMPLE
    .\database-backup.ps1 -BackupType Full -RetentionDays 30
#>

[CmdletBinding()]
param(
    [ValidateSet('Full', 'Incremental', 'Test')]
    [string]$BackupType = 'Full',

    [int]$RetentionDays = 30,

    [string]$BackupRoot = 'D:\backups\database-backups',

    [switch]$SkipVerification,

    [switch]$UploadToCloud
)

#region Configuration
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Critical databases to backup
$CriticalDatabases = @(
    'D:\databases\trading.db',              # Crypto trading system
    'D:\databases\database.db',             # Unified database
    'D:\databases\vibe-tutor.db',           # Vibe-Tutor app
    'D:\databases\vibe_justice.db',         # Legal AI system
    'D:\databases\vibe_studio.db',          # Code studio
    'D:\databases\agent_learning.db',       # Learning system
    'D:\databases\nova\nova_memory.db',     # Nova memory
    'D:\databases\task-registry\*.db'       # Task registries
)

# Backup metadata
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$BackupDir = Join-Path $BackupRoot $Timestamp
$LogFile = Join-Path $BackupRoot "backup_log_$Timestamp.txt"

#endregion

#region Functions

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogMessage

    # Ensure log directory exists before writing
    $logDir = Split-Path $LogFile -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    Add-Content -Path $LogFile -Value $LogMessage
}

function Write-MaintenanceLog {
    param(
        [int]$TotalBackups,
        [int]$SuccessfulBackups,
        [int]$FailedBackups,
        [long]$TotalSize,
        [string]$BackupLocation
    )

    $maintenanceLog = "D:\databases\maintenance.log"

    # Ensure directory exists
    $logDir = Split-Path $maintenanceLog -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    $status = if ($FailedBackups -eq 0) { "SUCCESS" } else { "PARTIAL" }
    $logEntry = @"
[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] DATABASE BACKUP - $status
  Total: $TotalBackups | Success: $SuccessfulBackups | Failed: $FailedBackups
  Size: $([math]::Round($TotalSize/1GB, 2)) GB
  Location: $BackupLocation
  Type: $BackupType | Retention: $RetentionDays days
"@

    Add-Content -Path $maintenanceLog -Value $logEntry
    Add-Content -Path $maintenanceLog -Value "" # Blank line separator
}

function Test-DatabaseIntegrity {
    param([string]$DatabasePath)

    try {
        # Use sqlite3 to check integrity
        $result = & sqlite3 $DatabasePath "PRAGMA integrity_check;"
        return $result -eq "ok"
    }
    catch {
        Write-Log "Integrity check failed for $DatabasePath : $_" -Level 'ERROR'
        return $false
    }
}

function Backup-Database {
    param(
        [string]$SourcePath,
        [string]$DestinationDir
    )

    if (-not (Test-Path $SourcePath)) {
        Write-Log "Database not found: $SourcePath" -Level 'WARN'
        return $null
    }

    $dbName = Split-Path $SourcePath -Leaf
    $destPath = Join-Path $DestinationDir $dbName

    Write-Log "Backing up: $dbName"

    # Pre-backup integrity check
    if (-not $SkipVerification) {
        Write-Log "  Verifying integrity..."
        if (-not (Test-DatabaseIntegrity -DatabasePath $SourcePath)) {
            Write-Log "  FAILED: Integrity check failed!" -Level 'ERROR'
            return $null
        }
    }

    # SQLite backup using .backup command (safest method)
    try {
        $backupCmd = ".backup '$destPath'"
        & sqlite3 $SourcePath $backupCmd

        # CRITICAL: Copy WAL and SHM files if they exist (SQLite WAL mode)
        $walFile = "$SourcePath-wal"
        $shmFile = "$SourcePath-shm"

        if (Test-Path $walFile) {
            Copy-Item -Path $walFile -Destination "$destPath-wal" -Force
            Write-Log "  Copied WAL file: $(Split-Path $walFile -Leaf)"
        }

        if (Test-Path $shmFile) {
            Copy-Item -Path $shmFile -Destination "$destPath-shm" -Force
            Write-Log "  Copied SHM file: $(Split-Path $shmFile -Leaf)"
        }

        $sourceSize = (Get-Item $SourcePath).Length
        $backupSize = (Get-Item $destPath).Length

        Write-Log "  Backed up: $([math]::Round($sourceSize/1MB, 2)) MB -> $([math]::Round($backupSize/1MB, 2)) MB"

        # Compress with 7-Zip if available, otherwise use .NET
        $filesToCompress = @($destPath)

        # Add WAL/SHM files to compression if they exist
        if (Test-Path "$destPath-wal") { $filesToCompress += "$destPath-wal" }
        if (Test-Path "$destPath-shm") { $filesToCompress += "$destPath-shm" }

        $compressedPath = "$destPath.7z"
        if (Get-Command 7z -ErrorAction SilentlyContinue) {
            & 7z a -t7z -mx=9 $compressedPath $filesToCompress | Out-Null
            # Remove all uncompressed files
            $filesToCompress | ForEach-Object { Remove-Item $_ -Force -ErrorAction SilentlyContinue }
            $finalSize = (Get-Item $compressedPath).Length
            $compressionRatio = [math]::Round((1 - $finalSize/$sourceSize) * 100, 1)
            Write-Log "  Compressed: $([math]::Round($finalSize/1MB, 2)) MB (${compressionRatio}% reduction)"
        }
        else {
            # Use .NET compression as fallback
            $compressedPath = "$destPath.zip"
            Compress-Archive -Path $filesToCompress -DestinationPath $compressedPath -CompressionLevel Optimal
            # Remove all uncompressed files
            $filesToCompress | ForEach-Object { Remove-Item $_ -Force -ErrorAction SilentlyContinue }
            $finalSize = (Get-Item $compressedPath).Length
            Write-Log "  Compressed (ZIP): $([math]::Round($finalSize/1MB, 2)) MB"
        }

        return @{
            Source = $SourcePath
            Backup = $compressedPath
            Size = $finalSize
            Timestamp = $Timestamp
        }
    }
    catch {
        Write-Log "  FAILED: $_" -Level 'ERROR'
        return $null
    }
}

function Remove-OldBackups {
    param([int]$Days)

    Write-Log "Removing backups older than $Days days..."
    $cutoffDate = (Get-Date).AddDays(-$Days)

    Get-ChildItem -Path $BackupRoot -Directory | Where-Object {
        $_.CreationTime -lt $cutoffDate
    } | ForEach-Object {
        Write-Log "  Removing: $($_.Name)"
        Remove-Item $_.FullName -Recurse -Force
    }

    # Remove old log files
    Get-ChildItem -Path $BackupRoot -Filter "backup_log_*.txt" | Where-Object {
        $_.CreationTime -lt $cutoffDate
    } | ForEach-Object {
        Remove-Item $_.FullName -Force
    }
}

function Test-BackupRecovery {
    param([string]$BackupPath)

    Write-Log "Testing backup recovery..."
    $tempDir = Join-Path $env:TEMP "backup-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        # Extract backup
        if ($BackupPath -like "*.7z") {
            & 7z x $BackupPath -o"$tempDir" -y | Out-Null
        }
        else {
            Expand-Archive -Path $BackupPath -DestinationPath $tempDir -Force
        }

        # Verify extracted database
        $extractedDb = Get-ChildItem -Path $tempDir -Filter "*.db" | Select-Object -First 1
        if ($extractedDb) {
            $isValid = Test-DatabaseIntegrity -DatabasePath $extractedDb.FullName
            Write-Log "  Recovery test: $(if ($isValid) { 'PASSED' } else { 'FAILED' })"
            return $isValid
        }
        else {
            Write-Log "  Recovery test: FAILED (no database found)" -Level 'ERROR'
            return $false
        }
    }
    catch {
        Write-Log "  Recovery test: FAILED ($_)" -Level 'ERROR'
        return $false
    }
    finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Send-BackupNotification {
    param(
        [int]$TotalBackups,
        [int]$SuccessfulBackups,
        [int]$FailedBackups,
        [long]$TotalSize
    )

    $status = if ($FailedBackups -eq 0) { "SUCCESS" } else { "WARNING" }
    $message = @"
Database Backup Report - $Timestamp
Status: $status
Total Databases: $TotalBackups
Successful: $SuccessfulBackups
Failed: $FailedBackups
Total Backup Size: $([math]::Round($TotalSize/1GB, 2)) GB
Backup Location: $BackupDir
Log File: $LogFile
"@

    Write-Log "`n$message"

    # TODO: Add email/Slack notification here if needed
    # Send-MailMessage or Invoke-WebRequest for webhooks
}

#endregion

#region Main Execution

Write-Log "=== Database Backup Started ==="
Write-Log "Backup Type: $BackupType"
Write-Log "Retention: $RetentionDays days"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Log "Backup directory: $BackupDir"

# Backup all databases
$results = @()
$successCount = 0
$failCount = 0
$totalSize = 0

foreach ($dbPattern in $CriticalDatabases) {
    $databases = Get-Item $dbPattern -ErrorAction SilentlyContinue

    foreach ($db in $databases) {
        $result = Backup-Database -SourcePath $db.FullName -DestinationDir $BackupDir

        if ($result) {
            $results += $result
            $successCount++
            $totalSize += $result.Size
        }
        else {
            $failCount++
        }
    }
}

# Post-backup verification
if (-not $SkipVerification -and $results.Count -gt 0) {
    Write-Log "`nVerifying backups..."
    $sampleBackup = $results | Get-Random -Count 1
    Test-BackupRecovery -BackupPath $sampleBackup.Backup | Out-Null
}

# Cleanup old backups
Remove-OldBackups -Days $RetentionDays

# Generate report
Send-BackupNotification -TotalBackups ($successCount + $failCount) `
                        -SuccessfulBackups $successCount `
                        -FailedBackups $failCount `
                        -TotalSize $totalSize

# Write to maintenance log for unified tracking
Write-MaintenanceLog -TotalBackups ($successCount + $failCount) `
                     -SuccessfulBackups $successCount `
                     -FailedBackups $failCount `
                     -TotalSize $totalSize `
                     -BackupLocation $BackupDir

Write-Log "=== Database Backup Completed ==="

# Exit with error code if any backups failed
if ($failCount -gt 0) {
    exit 1
}

#endregion
