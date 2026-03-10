#Requires -Version 7.0

<#
.SYNOPSIS
    Save current workspace state as a snapshot (like git commit)

.DESCRIPTION
    Creates a timestamped, compressed snapshot of the workspace with metadata.

.PARAMETER Description
    Description of changes (commit message)

.PARAMETER Branch
    Branch name (defaults to current branch)

.PARAMETER Tag
    Optional tag name (e.g., "v1.0.0", "production")

.EXAMPLE
    .\Save-Snapshot.ps1 -Description "Added user authentication"
    .\Save-Snapshot.ps1 -Description "Fixed login bug" -Tag "v1.0.1"

.NOTES
    Similar to: git commit -m "message"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Description,

    [Parameter(Mandatory = $false)]
    [string]$Branch,

    [Parameter(Mandatory = $false)]
    [string]$Tag,

    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech",

    [Parameter(Mandatory = $false)]
    [string]$WorkspacePath = "C:\dev"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Load configuration
$configPath = "$RepoPath\.config\repository.json"
if (-not (Test-Path $configPath)) {
    Write-Host "❌ Repository not initialized. Run Initialize-LocalRepo.ps1 first." -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json

# Get current branch if not specified
if (-not $Branch) {
    $statusPath = "$RepoPath\.config\status.json"
    if (Test-Path $statusPath) {
        $status = Get-Content $statusPath | ConvertFrom-Json
        $Branch = $status.currentBranch
    } else {
        $Branch = "main"
    }
}

# Generate snapshot ID (timestamp)
$snapshotId = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshotPath = "$RepoPath\snapshots\$snapshotId"

Write-Host "`n📸 Creating snapshot: $snapshotId" -ForegroundColor Cyan
Write-Host "Branch: $Branch" -ForegroundColor Yellow
Write-Host "Description: $Description`n" -ForegroundColor Gray

# Create snapshot directory
New-Item -Path $snapshotPath -ItemType Directory -Force | Out-Null

# Copy workspace (excluding patterns)
Write-Host "Copying workspace files..." -ForegroundColor Cyan

$excludePatterns = $config.excludePatterns
$copiedFiles = 0
$totalSize = 0

# Use robocopy for efficient copying with exclusions
$excludeArgs = $excludePatterns | ForEach-Object { "/XD $_" }
$robocopyArgs = @(
    $WorkspacePath,
    "$snapshotPath\workspace",
    "/E",           # Copy subdirectories including empty
    "/MT:8",        # Multi-threaded (8 threads)
    "/NFL",         # No file list
    "/NDL",         # No directory list
    "/NJH",         # No job header
    "/NJS",         # No job summary
    "/XD", "node_modules", ".nx", ".turbo", "dist", "coverage", "target", ".vite", "playwright-report"
)

$robocopyResult = & robocopy @robocopyArgs 2>&1

# Count files and calculate size
$files = Get-ChildItem -Path "$snapshotPath\workspace" -Recurse -File
$copiedFiles = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum

Write-Host "✓ Copied $copiedFiles files ($([math]::Round($totalSize / 1MB, 2)) MB)" -ForegroundColor Green

# Compress snapshot (optional but recommended)
if ($config.compression) {
    Write-Host "`nCompressing snapshot..." -ForegroundColor Cyan

    $archivePath = "$snapshotPath.zip"
    Compress-Archive -Path "$snapshotPath\workspace" -DestinationPath $archivePath -CompressionLevel $config.compressionLevel -Force

    $compressedSize = (Get-Item $archivePath).Length
    $compressionRatio = [math]::Round((1 - ($compressedSize / $totalSize)) * 100, 1)

    Write-Host "✓ Compressed to $([math]::Round($compressedSize / 1MB, 2)) MB ($compressionRatio% smaller)" -ForegroundColor Green

    # Remove uncompressed directory
    Remove-Item -Path "$snapshotPath\workspace" -Recurse -Force

    # Move archive into snapshot directory
    Move-Item -Path $archivePath -Destination "$snapshotPath\workspace.zip" -Force
}

# Create metadata
Write-Host "`nGenerating metadata..." -ForegroundColor Cyan

$metadata = @{
    snapshotId = $snapshotId
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    description = $Description
    branch = $Branch
    author = $env:USERNAME
    fileCount = $copiedFiles
    originalSize = $totalSize
    compressedSize = if ($config.compression) { (Get-Item "$snapshotPath\workspace.zip").Length } else { $totalSize }
    compressionEnabled = $config.compression
    workspacePath = $WorkspacePath
    tag = $Tag
}

$metadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$snapshotPath\metadata.json" -Encoding UTF8

# Update CHANGELOG
$changelogPath = "$RepoPath\logs\CHANGELOG.md"
$changelogEntry = @"

## [$snapshotId] - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

**Branch:** $Branch
**Description:** $Description
**Files:** $copiedFiles files
**Size:** $([math]::Round($totalSize / 1MB, 2)) MB → $([math]::Round($metadata.compressedSize / 1MB, 2)) MB (compressed)
**Author:** $env:USERNAME
$(if ($Tag) { "**Tag:** $Tag" })

---

"@

$changelogEntry | Add-Content -Path $changelogPath -Encoding UTF8

# Update branch metadata
$branchPath = "$RepoPath\branches\$Branch"
if (-not (Test-Path $branchPath)) {
    New-Item -Path $branchPath -ItemType Directory -Force | Out-Null

    $branchMetadata = @{
        name = $Branch
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        description = "Auto-created branch"
        protected = $false
        lastSnapshot = $snapshotId
    }

    $branchMetadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$branchPath\metadata.json" -Encoding UTF8
} else {
    $branchMetadataPath = "$branchPath\metadata.json"
    $branchData = Get-Content $branchMetadataPath | ConvertFrom-Json
    $branchData.lastSnapshot = $snapshotId
    $branchData | ConvertTo-Json -Depth 10 | Set-Content -Path $branchMetadataPath -Encoding UTF8
}

# Create tag if specified
if ($Tag) {
    $tagPath = "$RepoPath\tags\$Tag"
    New-Item -Path $tagPath -ItemType Directory -Force | Out-Null

    $tagMetadata = @{
        name = $Tag
        snapshotId = $snapshotId
        branch = $Branch
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        description = $Description
    }

    $tagMetadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$tagPath\metadata.json" -Encoding UTF8

    # Create symbolic link to snapshot
    New-Item -ItemType SymbolicLink -Path "$tagPath\snapshot" -Target $snapshotPath -Force | Out-Null

    Write-Host "✓ Tagged as: $Tag" -ForegroundColor Green
}

# Update repository status
$statusPath = "$RepoPath\.config\status.json"
$status = @{
    initialized = $true
    lastChecked = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    currentBranch = $Branch
    lastSnapshot = $snapshotId
    snapshotCount = (Get-ChildItem "$RepoPath\snapshots" -Directory).Count
    totalSize = "$([math]::Round((Get-ChildItem "$RepoPath\snapshots" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB, 2)) GB"
}

$status | ConvertTo-Json -Depth 10 | Set-Content -Path $statusPath -Encoding UTF8

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Snapshot Created Successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Snapshot ID:  " -NoNewline
Write-Host $snapshotId -ForegroundColor Yellow

Write-Host "Branch:       " -NoNewline
Write-Host $Branch -ForegroundColor Cyan

if ($Tag) {
    Write-Host "Tag:          " -NoNewline
    Write-Host $Tag -ForegroundColor Magenta
}

Write-Host "Files:        " -NoNewline
Write-Host "$copiedFiles files" -ForegroundColor White

Write-Host "Size:         " -NoNewline
Write-Host "$([math]::Round($metadata.compressedSize / 1MB, 2)) MB" -ForegroundColor White

Write-Host "`nLocation: " -NoNewline
Write-Host $snapshotPath -ForegroundColor Gray

Write-Host "`n✓ Snapshot saved successfully!`n" -ForegroundColor Green
