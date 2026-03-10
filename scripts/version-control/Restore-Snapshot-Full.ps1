#Requires -Version 7.0

<#
.SYNOPSIS
    Restore full snapshot (C:\dev + D:\databases + D:\learning-system)

.DESCRIPTION
    Restores a complete snapshot including code and data.
    Creates safety backup before restoring.

.PARAMETER SnapshotId
    Snapshot ID to restore (YYYYMMDD-HHMMSS)

.PARAMETER Tag
    Tag name to restore from (e.g., "v1.0.0")

.PARAMETER RestoreDatabases
    Restore D:\databases (default: true)

.PARAMETER RestoreLearning
    Restore D:\learning-system (default: true)

.PARAMETER SkipBackup
    Skip creating safety backup before restore (NOT RECOMMENDED)

.EXAMPLE
    .\Restore-Snapshot-Full.ps1 -SnapshotId "20260116-130000"
    .\Restore-Snapshot-Full.ps1 -Tag "v1.0.0"
    .\Restore-Snapshot-Full.ps1 -SnapshotId "20260116-130000" -RestoreDatabases $false

.NOTES
    ALWAYS creates a safety backup before restoring unless -SkipBackup is used
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$SnapshotId,

    [Parameter(Mandatory = $false)]
    [string]$Tag,

    [Parameter(Mandatory = $false)]
    [bool]$RestoreDatabases = $true,

    [Parameter(Mandatory = $false)]
    [bool]$RestoreLearning = $true,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBackup,

    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Validate inputs
if (-not $SnapshotId -and -not $Tag) {
    Write-Host "❌ Error: Must specify either -SnapshotId or -Tag" -ForegroundColor Red
    exit 1
}

# Resolve tag to snapshot ID
if ($Tag) {
    $tagPath = "$RepoPath\tags\$Tag\metadata.json"
    if (-not (Test-Path $tagPath)) {
        Write-Host "❌ Error: Tag not found: $Tag" -ForegroundColor Red
        exit 1
    }
    $tagData = Get-Content $tagPath | ConvertFrom-Json
    $SnapshotId = $tagData.snapshotId
    Write-Host "Tag '$Tag' resolves to snapshot: $SnapshotId`n" -ForegroundColor Cyan
}

# Verify snapshot exists
$snapshotPath = "$RepoPath\snapshots\$SnapshotId"
if (-not (Test-Path $snapshotPath)) {
    Write-Host "❌ Error: Snapshot not found: $SnapshotId" -ForegroundColor Red
    exit 1
}

# Load snapshot metadata
$metadataPath = "$snapshotPath\metadata.json"
if (-not (Test-Path $metadataPath)) {
    Write-Host "❌ Error: Snapshot metadata not found" -ForegroundColor Red
    exit 1
}

$metadata = Get-Content $metadataPath | ConvertFrom-Json

# Display snapshot info
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║                                                            ║" -ForegroundColor Yellow
Write-Host "║           FULL SNAPSHOT RESTORE                            ║" -ForegroundColor Yellow
Write-Host "║                                                            ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Write-Host "`nSnapshot Details:" -ForegroundColor Cyan
Write-Host "  ID:          " -NoNewline; Write-Host $metadata.snapshotId -ForegroundColor Yellow
Write-Host "  Date:        " -NoNewline; Write-Host $metadata.timestamp -ForegroundColor Gray
Write-Host "  Branch:      " -NoNewline; Write-Host $metadata.branch -ForegroundColor Cyan
Write-Host "  Description: " -NoNewline; Write-Host $metadata.description -ForegroundColor White

if ($metadata.tag) {
    Write-Host "  Tag:         " -NoNewline; Write-Host $metadata.tag -ForegroundColor Magenta
}

Write-Host "`nWhat will be restored:" -ForegroundColor Yellow
Write-Host "  ✓ C:\dev (workspace/code)" -ForegroundColor Green

if ($metadata.components.databases.included -and $RestoreDatabases) {
    Write-Host "  ✓ D:\databases (SQLite databases)" -ForegroundColor Green
} else {
    Write-Host "  ✗ D:\databases (skipped)" -ForegroundColor DarkGray
}

if ($metadata.components.learning.included -and $RestoreLearning) {
    Write-Host "  ✓ D:\learning-system (AI learning data)" -ForegroundColor Green
} else {
    Write-Host "  ✗ D:\learning-system (skipped)" -ForegroundColor DarkGray
}

# Confirm restore
Write-Host "`n⚠️  WARNING: This will overwrite current data!" -ForegroundColor Red
$confirm = Read-Host "`nContinue with restore? (type 'yes' to confirm)"

if ($confirm -ne 'yes') {
    Write-Host "`nRestore cancelled.`n" -ForegroundColor Yellow
    exit 0
}

# Create safety backup (unless skipped)
if (-not $SkipBackup) {
    Write-Host "`n📸 Creating safety backup before restore..." -ForegroundColor Cyan
    & "$PSScriptRoot\Save-Snapshot-Full.ps1" -Description "Auto-backup before restoring $SnapshotId" -IncludeDatabases $RestoreDatabases -IncludeLearning $RestoreLearning
    Write-Host "✓ Safety backup created`n" -ForegroundColor Green
}

# Extract snapshot if compressed
$archivePath = "$snapshotPath\full-snapshot.zip"
if (Test-Path $archivePath) {
    Write-Host "📂 Extracting snapshot..." -ForegroundColor Cyan

    $extractPath = "$snapshotPath\temp-extract"
    if (Test-Path $extractPath) {
        Remove-Item -Path $extractPath -Recurse -Force
    }

    Expand-Archive -Path $archivePath -DestinationPath $extractPath -Force

    Write-Host "✓ Snapshot extracted`n" -ForegroundColor Green
} else {
    $extractPath = $snapshotPath
}

# ============================================================================
# RESTORE C:\dev (Workspace)
# ============================================================================
Write-Host "📁 [1/3] Restoring workspace (C:\dev)..." -ForegroundColor Cyan

$workspaceSource = "$extractPath\workspace"
if (Test-Path $workspaceSource) {
    # Clear current workspace (except .git and version-control)
    Get-ChildItem "C:\dev" -Force -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -ne '.git' -and $_.Name -ne 'scripts'
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    # Restore workspace
    Copy-Item -Path "$workspaceSource\*" -Destination "C:\dev" -Recurse -Force

    $workspaceFiles = Get-ChildItem "C:\dev" -Recurse -File | Measure-Object
    Write-Host "✓ Restored workspace: $($workspaceFiles.Count) files" -ForegroundColor Green
} else {
    Write-Host "⚠ Workspace data not found in snapshot" -ForegroundColor Yellow
}

# ============================================================================
# RESTORE D:\databases (if enabled)
# ============================================================================
if ($metadata.components.databases.included -and $RestoreDatabases) {
    Write-Host "`n📊 [2/3] Restoring databases (D:\databases)..." -ForegroundColor Cyan

    $dbSource = "$extractPath\databases"
    if (Test-Path $dbSource) {
        # Clear current databases
        if (Test-Path "D:\databases") {
            Remove-Item -Path "D:\databases\*" -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            New-Item -Path "D:\databases" -ItemType Directory -Force | Out-Null
        }

        # Restore databases
        Copy-Item -Path "$dbSource\*" -Destination "D:\databases" -Recurse -Force

        $dbFiles = Get-ChildItem "D:\databases" -Recurse -File | Measure-Object
        Write-Host "✓ Restored databases: $($dbFiles.Count) files" -ForegroundColor Green
    } else {
        Write-Host "⚠ Database data not found in snapshot" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2/3] Databases skipped" -ForegroundColor DarkGray
}

# ============================================================================
# RESTORE D:\learning-system (if enabled)
# ============================================================================
if ($metadata.components.learning.included -and $RestoreLearning) {
    Write-Host "`n🧠 [3/3] Restoring learning data (D:\learning-system)..." -ForegroundColor Cyan

    $learningSource = "$extractPath\learning"
    if (Test-Path $learningSource) {
        # Clear current learning data
        if (Test-Path "D:\learning-system") {
            Remove-Item -Path "D:\learning-system\*" -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            New-Item -Path "D:\learning-system" -ItemType Directory -Force | Out-Null
        }

        # Restore learning data
        Copy-Item -Path "$learningSource\*" -Destination "D:\learning-system" -Recurse -Force

        $learningFiles = Get-ChildItem "D:\learning-system" -Recurse -File | Measure-Object
        Write-Host "✓ Restored learning data: $($learningFiles.Count) files" -ForegroundColor Green
    } else {
        Write-Host "⚠ Learning data not found in snapshot" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/3] Learning data skipped" -ForegroundColor DarkGray
}

# Cleanup temp extraction
if (Test-Path "$snapshotPath\temp-extract") {
    Remove-Item -Path "$snapshotPath\temp-extract" -Recurse -Force
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║           RESTORE COMPLETED SUCCESSFULLY!                  ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nRestored from snapshot: " -NoNewline; Write-Host $SnapshotId -ForegroundColor Yellow
Write-Host "Date: " -NoNewline; Write-Host $metadata.timestamp -ForegroundColor Gray
Write-Host "Description: " -NoNewline; Write-Host $metadata.description -ForegroundColor White

Write-Host "`n✓ Full system restore complete!`n" -ForegroundColor Green
