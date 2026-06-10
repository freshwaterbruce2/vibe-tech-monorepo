# Requires -Version 7.0
<#
.SYNOPSIS
    Backs up critical VibeTech data and monorepo source files to Google Drive
    using the mounted Google Drive Desktop virtual drive.
.DESCRIPTION
    Detects the Google Drive Desktop mount, starts the client if necessary,
    and uses robocopy to mirror the database, learning system, and monorepo
    folders to Google Drive.
.EXAMPLE
    .\backup-to-gdrive-native.ps1 [-DryRun]
#>

[CmdletBinding()]
param(
    [switch]$DryRun
)

# Start Google Drive if it's not running
$gdriveProcess = Get-Process -Name "GoogleDriveFS" -ErrorAction SilentlyContinue
if (-not $gdriveProcess) {
    Write-Host "Google Drive Desktop client is not running. Attempting to start it..." -ForegroundColor Yellow
    $gdriveLauncher = "C:\Program Files\Google\Drive File Stream\launch.bat"
    if (Test-Path $gdriveLauncher) {
        Start-Process -FilePath $gdriveLauncher -WindowStyle Hidden
        Write-Host "Started launcher. Waiting 10 seconds for Google Drive to mount..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Error "Google Drive Desktop installation launcher not found at $gdriveLauncher"
        exit 1
    }
}

# Auto-detect Google Drive mount letter
$gdriveVolume = Get-Volume | Where-Object { $_.FileSystemLabel -like "*Google Drive*" -or $_.DriveLetter -eq 'G' } | Select-Object -First 1
if (-not $gdriveVolume) {
    # Fallback: check if G: or H: paths exist
    $mountLetter = $null
    foreach ($letter in @('G', 'H', 'I', 'J', 'K')) {
        if (Test-Path "${letter}:\My Drive") {
            $mountLetter = $letter
            break
        }
    }
} else {
    $mountLetter = $gdriveVolume.DriveLetter
}

if (-not $mountLetter) {
    Write-Error "Could not detect a mounted Google Drive virtual disk. Please ensure Google Drive Desktop is running and you are signed in."
    exit 1
}

$gdriveRoot = "${mountLetter}:\My Drive\vibetech-backup"
Write-Host "Detected Google Drive mount at: ${mountLetter}:\" -ForegroundColor Green
Write-Host "Backup Destination: $gdriveRoot" -ForegroundColor Green

if ($DryRun) {
    Write-Host "(DRY RUN MODE - files will not actually be copied)" -ForegroundColor Cyan
}

# Ensure destination directory exists
if (-not $DryRun -and -not (Test-Path $gdriveRoot)) {
    New-Item -ItemType Directory -Path $gdriveRoot -Force | Out-Null
}

# Helper function for copying directories via Robocopy
function Sync-Folder {
    param(
        [string]$Source,
        [string]$DestinationName,
        [string[]]$Excludes = @()
    )

    if (-not (Test-Path $Source)) {
        Write-Host "Source directory not found, skipping: $Source" -ForegroundColor DarkGray
        return
    }

    $destPath = Join-Path $gdriveRoot $DestinationName
    Write-Host "`nSyncing: $Source -> $destPath" -ForegroundColor Cyan

    # Robocopy arguments:
    # /MIR - Mirror a directory tree
    # /FFT - Assume FAT file times (prevents unnecessary copying due to time resolution differences)
    # /R:2 - Retry failed copies 2 times
    # /W:5 - Wait 5 seconds between retries
    # /NP  - No Progress - don't display copy percentage (prevents log pollution)
    # /NDL - No Directory List - don't log directory names
    $rcArgs = @($Source, $destPath, "/MIR", "/FFT", "/R:2", "/W:5", "/NP", "/NDL")
    
    if ($Excludes.Count -gt 0) {
        $rcArgs += "/XD"
        $rcArgs += $Excludes
    }

    if ($DryRun) {
        $rcArgs += "/L" # List only - don't copy
    }

    # Run robocopy (capturing exit code; 0-7 are success/no-error codes for robocopy)
    $process = Start-Process -FilePath "robocopy.exe" -ArgumentList $rcArgs -NoNewWindow -PassThru -Wait
    $exitCode = $process.ExitCode
    
    if ($exitCode -ge 8) {
        Write-Warning "Robocopy warning/error exit code: $exitCode"
    } else {
        Write-Host "Completed syncing $DestinationName successfully." -ForegroundColor Green
    }
}

# 1. Back up SQLite databases (D:\databases)
Sync-Folder -Source "D:\databases" -DestinationName "databases"

# 2. Back up learning-system (D:\learning-system)
Sync-Folder -Source "D:\learning-system" -DestinationName "learning-system"

# 3. Back up vector memory bank (D:\memory_bank or other active memory folders if exist)
Sync-Folder -Source "D:\memory_bank" -DestinationName "memory_bank"

# 4. Back up datasets (D:\data)
Sync-Folder -Source "D:\data" -DestinationName "data"

# 5. Back up app data (D:\vibe-tech-data, D:\nova-agent-data)
Sync-Folder -Source "D:\vibe-tech-data" -DestinationName "vibe-tech-data"
Sync-Folder -Source "D:\nova-agent-data" -DestinationName "nova-agent-data"

# 6. Back up V:\monorepo source code (excluding packages/dependencies and build outputs)
$monorepoExcludes = @(
    "node_modules",
    ".nx",
    "dist",
    "build",
    "target",
    ".pnpm-store",
    ".cache",
    "coverage",
    "tmp",
    "worktrees"
)
Sync-Folder -Source "V:\monorepo" -DestinationName "monorepo" -Excludes $monorepoExcludes

Write-Host "`n=== Google Drive Backup Completed ===" -ForegroundColor Green
