#Requires -Version 7.0

<#
.SYNOPSIS
    Restore workspace from a snapshot (like git checkout / reset --hard)

.DESCRIPTION
    Restores the workspace to a previous snapshot state.
    Creates backup of current state before restoring.

.PARAMETER SnapshotId
    Snapshot ID to restore (YYYYMMDD-HHMMSS)

.PARAMETER NoBackup
    Skip creating backup of current state

.PARAMETER Force
    Force restore without confirmation

.EXAMPLE
    .\Restore-Snapshot.ps1 -SnapshotId "20260114-153000"
    .\Restore-Snapshot.ps1 -SnapshotId "20260114-153000" -Force

.NOTES
    Similar to: git checkout <commit> or git reset --hard <commit>
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SnapshotId,

    [Parameter(Mandatory = $false)]
    [switch]$NoBackup,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech",

    [Parameter(Mandatory = $false)]
    [string]$WorkspacePath = "C:\dev"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Validate snapshot exists
$snapshotPath = "$RepoPath\snapshots\$SnapshotId"
if (-not (Test-Path $snapshotPath)) {
    Write-Host "❌ Snapshot not found: $SnapshotId" -ForegroundColor Red
    Write-Host "`nAvailable snapshots:" -ForegroundColor Yellow
    & "$PSScriptRoot\List-Snapshots.ps1" -Limit 5
    exit 1
}

# Load snapshot metadata
$metadataPath = "$snapshotPath\metadata.json"
if (-not (Test-Path $metadataPath)) {
    Write-Host "❌ Snapshot metadata missing for: $SnapshotId" -ForegroundColor Red
    exit 1
}

$metadata = Get-Content $metadataPath | ConvertFrom-Json

# Display snapshot info
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "Restore Snapshot" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "Snapshot ID:  " -NoNewline
Write-Host $metadata.snapshotId -ForegroundColor Cyan

Write-Host "Date:         " -NoNewline
Write-Host $metadata.timestamp -ForegroundColor Gray

Write-Host "Branch:       " -NoNewline
Write-Host $metadata.branch -ForegroundColor Cyan

Write-Host "Description:  " -NoNewline
Write-Host $metadata.description -ForegroundColor White

Write-Host "Files:        " -NoNewline
Write-Host "$($metadata.fileCount) files" -ForegroundColor Gray

Write-Host "`n⚠️  This will replace your current workspace with this snapshot!`n" -ForegroundColor Yellow

# Confirm restore
if (-not $Force) {
    $response = Read-Host "Continue? (Y/N)"
    if ($response -ne 'Y') {
        Write-Host "`nRestore cancelled.`n" -ForegroundColor Gray
        exit 0
    }
}

# Create backup of current state
if (-not $NoBackup) {
    Write-Host "`n📦 Creating backup of current state..." -ForegroundColor Cyan

    $backupId = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backupDescription = "Automatic backup before restoring to $SnapshotId"

    try {
        & "$PSScriptRoot\Save-Snapshot.ps1" -Description $backupDescription -Branch "backups"
        Write-Host "✓ Backup created: $backupId" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
        $response = Read-Host "Continue without backup? (Y/N)"
        if ($response -ne 'Y') {
            Write-Host "`nRestore cancelled.`n" -ForegroundColor Gray
            exit 0
        }
    }
}

# Extract snapshot
Write-Host "`n📂 Extracting snapshot..." -ForegroundColor Cyan

$archivePath = "$snapshotPath\workspace.zip"
$tempExtractPath = "$env:TEMP\vibetech-restore-$SnapshotId"

if (Test-Path $tempExtractPath) {
    Remove-Item -Path $tempExtractPath -Recurse -Force
}

if ($metadata.compressionEnabled) {
    Expand-Archive -Path $archivePath -DestinationPath $tempExtractPath -Force
    Write-Host "✓ Extracted snapshot archive" -ForegroundColor Green
} else {
    # Uncompressed snapshot (older format)
    $workspacePath = "$snapshotPath\workspace"
    if (Test-Path $workspacePath) {
        Copy-Item -Path $workspacePath -Destination $tempExtractPath -Recurse -Force
        Write-Host "✓ Copied snapshot files" -ForegroundColor Green
    } else {
        Write-Host "❌ Snapshot workspace not found" -ForegroundColor Red
        exit 1
    }
}

# Clear current workspace (preserve excluded directories)
Write-Host "`n🗑️  Clearing current workspace..." -ForegroundColor Cyan

$preserveDirs = @("node_modules", ".nx", ".turbo", "dist", "coverage", "target")
$filesToDelete = Get-ChildItem -Path $WorkspacePath -Recurse -File | Where-Object {
    $preserve = $false
    foreach ($dir in $preserveDirs) {
        if ($_.FullName -like "*\$dir\*") {
            $preserve = $true
            break
        }
    }
    -not $preserve
}

foreach ($file in $filesToDelete) {
    Remove-Item -Path $file.FullName -Force
}

Write-Host "✓ Cleared workspace files" -ForegroundColor Green

# Restore snapshot to workspace
Write-Host "`n📋 Restoring snapshot to workspace..." -ForegroundColor Cyan

$sourceFiles = Get-ChildItem -Path "$tempExtractPath\workspace" -Recurse -File
$copiedCount = 0

foreach ($file in $sourceFiles) {
    $relativePath = $file.FullName.Substring("$tempExtractPath\workspace".Length + 1)
    $destPath = Join-Path $WorkspacePath $relativePath

    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -Path $destDir -ItemType Directory -Force | Out-Null
    }

    Copy-Item -Path $file.FullName -Destination $destPath -Force
    $copiedCount++

    if ($copiedCount % 100 -eq 0) {
        Write-Host "  Copied $copiedCount files..." -ForegroundColor Gray
    }
}

Write-Host "✓ Restored $copiedCount files" -ForegroundColor Green

# Cleanup temp directory
Remove-Item -Path $tempExtractPath -Recurse -Force

# Update repository status
$statusPath = "$RepoPath\.config\status.json"
if (Test-Path $statusPath) {
    $status = Get-Content $statusPath | ConvertFrom-Json
    $status.currentBranch = $metadata.branch
    $status.lastChecked = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $status | ConvertTo-Json -Depth 10 | Set-Content -Path $statusPath -Encoding UTF8
}

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Snapshot Restored Successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Restored:     " -NoNewline
Write-Host $metadata.snapshotId -ForegroundColor Yellow

Write-Host "Branch:       " -NoNewline
Write-Host $metadata.branch -ForegroundColor Cyan

Write-Host "Files:        " -NoNewline
Write-Host "$copiedCount files" -ForegroundColor White

if (-not $NoBackup) {
    Write-Host "`n💡 Backup created in 'backups' branch" -ForegroundColor Cyan
    Write-Host "   To revert: .\Restore-Snapshot.ps1 -SnapshotId $backupId`n" -ForegroundColor Gray
}

Write-Host "✓ Workspace restored successfully!`n" -ForegroundColor Green

# Suggest next steps
Write-Host "Next steps:`n" -ForegroundColor Cyan
Write-Host "1. Verify workspace: " -NoNewline
Write-Host "Get-ChildItem C:\dev" -ForegroundColor Gray
Write-Host "2. Run quality checks: " -NoNewline
Write-Host "pnpm run quality" -ForegroundColor Gray
Write-Host "3. View history: " -NoNewline
Write-Host ".\List-Snapshots.ps1`n" -ForegroundColor Gray
