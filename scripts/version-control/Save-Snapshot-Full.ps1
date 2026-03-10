#Requires -Version 7.0

<#
.SYNOPSIS
    Save full snapshot including C:\dev + D:\databases + D:\learning-system

.DESCRIPTION
    Creates a comprehensive snapshot of both code and data:
    - C:\dev (workspace/code)
    - D:\databases (SQLite databases)
    - D:\learning-system (AI learning data)

.PARAMETER Description
    Description of changes (commit message)

.PARAMETER Tag
    Optional tag name (e.g., "v1.0.0", "production")

.PARAMETER IncludeDatabases
    Include D:\databases in snapshot (default: true)

.PARAMETER IncludeLearning
    Include D:\learning-system in snapshot (default: true)

.EXAMPLE
    .\Save-Snapshot-Full.ps1 -Description "Full backup before migration"
    .\Save-Snapshot-Full.ps1 -Description "Production ready" -Tag "v1.0.0"
    .\Save-Snapshot-Full.ps1 -Description "Code only" -IncludeDatabases $false

.NOTES
    This creates larger snapshots than Save-Snapshot.ps1 (code only)
    Use for major milestones, production releases, or before risky changes
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Description,

    [Parameter(Mandatory = $false)]
    [string]$Tag,

    [Parameter(Mandatory = $false)]
    [bool]$IncludeDatabases = $true,

    [Parameter(Mandatory = $false)]
    [bool]$IncludeLearning = $true,

    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech",

    [Parameter(Mandatory = $false)]
    [string]$WorkspacePath = "C:\dev"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Color output functions
function Write-Section { param($Message) Write-Host "`n$Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "  $Message" -ForegroundColor Gray }

# Load configuration
$configPath = "$RepoPath\.config\repository.json"
if (-not (Test-Path $configPath)) {
    Write-Host "❌ Repository not initialized. Run Initialize-LocalRepo.ps1 first." -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json

# Get current branch
$statusPath = "$RepoPath\.config\status.json"
if (Test-Path $statusPath) {
    $status = Get-Content $statusPath | ConvertFrom-Json
    $Branch = $status.currentBranch
} else {
    $Branch = "main"
}

# Generate snapshot ID (timestamp)
$snapshotId = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshotPath = "$RepoPath\snapshots\$snapshotId"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║              FULL SYSTEM SNAPSHOT                          ║" -ForegroundColor Cyan
Write-Host "║         Code + Databases + Learning Data                   ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nSnapshot ID:  " -NoNewline; Write-Host $snapshotId -ForegroundColor Yellow
Write-Host "Branch:       " -NoNewline; Write-Host $Branch -ForegroundColor Cyan
Write-Host "Description:  " -NoNewline; Write-Host $Description -ForegroundColor Gray

if ($Tag) {
    Write-Host "Tag:          " -NoNewline; Write-Host $Tag -ForegroundColor Magenta
}

Write-Host "`nWhat will be captured:" -ForegroundColor Yellow
Write-Host "  ✓ C:\dev (workspace/code)" -ForegroundColor Green
if ($IncludeDatabases) {
    Write-Host "  ✓ D:\databases (SQLite databases)" -ForegroundColor Green
} else {
    Write-Host "  ✗ D:\databases (skipped)" -ForegroundColor DarkGray
}
if ($IncludeLearning) {
    Write-Host "  ✓ D:\learning-system (AI learning data)" -ForegroundColor Green
} else {
    Write-Host "  ✗ D:\learning-system (skipped)" -ForegroundColor DarkGray
}

# Create snapshot directory structure
New-Item -Path $snapshotPath -ItemType Directory -Force | Out-Null
New-Item -Path "$snapshotPath\workspace" -ItemType Directory -Force | Out-Null
New-Item -Path "$snapshotPath\databases" -ItemType Directory -Force | Out-Null
New-Item -Path "$snapshotPath\learning" -ItemType Directory -Force | Out-Null

$totalFiles = 0
$totalSize = 0

# ============================================================================
# 1. COPY C:\dev (Workspace/Code)
# ============================================================================
Write-Section "📁 [1/3] Copying workspace (C:\dev)..."

$robocopyArgs = @(
    $WorkspacePath,
    "$snapshotPath\workspace",
    "/E",           # Copy subdirectories including empty
    "/MT:8",        # Multi-threaded (8 threads)
    "/NFL",         # No file list
    "/NDL",         # No directory list
    "/NJH",         # No job header
    "/NJS",         # No job summary
    "/XD", "node_modules", ".nx", ".turbo", "dist", "coverage", "target", ".vite", "playwright-report", "_backups", ".git"
)

$robocopyResult = & robocopy @robocopyArgs 2>&1

$workspaceFiles = Get-ChildItem -Path "$snapshotPath\workspace" -Recurse -File
$workspaceCount = $workspaceFiles.Count
$workspaceSize = ($workspaceFiles | Measure-Object -Property Length -Sum).Sum

$totalFiles += $workspaceCount
$totalSize += $workspaceSize

Write-Success "Workspace: $workspaceCount files ($([math]::Round($workspaceSize / 1MB, 2)) MB)"

# ============================================================================
# 2. COPY D:\databases (if enabled)
# ============================================================================
if ($IncludeDatabases -and (Test-Path "D:\databases")) {
    Write-Section "📊 [2/3] Copying databases (D:\databases)..."

    $dbArgs = @(
        "D:\databases",
        "$snapshotPath\databases",
        "/E",
        "/MT:8",
        "/NFL", "/NDL", "/NJH", "/NJS",
        "/XF", "*.lock", "*.tmp", "*-journal", "*-wal", "*-shm"  # Exclude SQLite temp files
    )

    $dbResult = & robocopy @dbArgs 2>&1

    $dbFiles = Get-ChildItem -Path "$snapshotPath\databases" -Recurse -File -ErrorAction SilentlyContinue
    if ($dbFiles) {
        $dbCount = $dbFiles.Count
        $dbSize = ($dbFiles | Measure-Object -Property Length -Sum).Sum

        $totalFiles += $dbCount
        $totalSize += $dbSize

        Write-Success "Databases: $dbCount files ($([math]::Round($dbSize / 1MB, 2)) MB)"
    } else {
        Write-Info "No database files found"
    }
} else {
    Write-Info "[2/3] Databases skipped"
}

# ============================================================================
# 3. COPY D:\learning-system (if enabled)
# ============================================================================
if ($IncludeLearning -and (Test-Path "D:\learning-system")) {
    Write-Section "🧠 [3/3] Copying learning data (D:\learning-system)..."

    $learningArgs = @(
        "D:\learning-system",
        "$snapshotPath\learning",
        "/E",
        "/MT:8",
        "/NFL", "/NDL", "/NJH", "/NJS",
        "/XF", "*.tmp", "*.cache", "*.lock"
    )

    $learningResult = & robocopy @learningArgs 2>&1

    $learningFiles = Get-ChildItem -Path "$snapshotPath\learning" -Recurse -File -ErrorAction SilentlyContinue
    if ($learningFiles) {
        $learningCount = $learningFiles.Count
        $learningSize = ($learningFiles | Measure-Object -Property Length -Sum).Sum

        $totalFiles += $learningCount
        $totalSize += $learningSize

        Write-Success "Learning: $learningCount files ($([math]::Round($learningSize / 1MB, 2)) MB)"
    } else {
        Write-Info "No learning data found"
    }
} else {
    Write-Info "[3/3] Learning data skipped"
}

# ============================================================================
# COMPRESS SNAPSHOT
# ============================================================================
if ($config.compression) {
    Write-Section "🗜️  Compressing snapshot..."

    $archivePath = "$snapshotPath\full-snapshot.zip"
    Compress-Archive -Path "$snapshotPath\workspace", "$snapshotPath\databases", "$snapshotPath\learning" -DestinationPath $archivePath -CompressionLevel $config.compressionLevel -Force

    $compressedSize = (Get-Item $archivePath).Length
    $compressionRatio = [math]::Round((1 - ($compressedSize / $totalSize)) * 100, 1)

    Write-Success "Compressed to $([math]::Round($compressedSize / 1MB, 2)) MB ($compressionRatio% smaller)"

    # Remove uncompressed directories
    Remove-Item -Path "$snapshotPath\workspace" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$snapshotPath\databases" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "$snapshotPath\learning" -Recurse -Force -ErrorAction SilentlyContinue

    $finalSize = $compressedSize
} else {
    $finalSize = $totalSize
}

# ============================================================================
# CREATE METADATA
# ============================================================================
Write-Section "📋 Generating metadata..."

$metadata = @{
    snapshotId = $snapshotId
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    description = $Description
    branch = $Branch
    author = $env:USERNAME
    snapshotType = "full"
    fileCount = $totalFiles
    originalSize = $totalSize
    compressedSize = $finalSize
    compressionEnabled = $config.compression
    components = @{
        workspace = @{
            path = "C:\dev"
            files = $workspaceCount
            size = $workspaceSize
        }
        databases = @{
            path = "D:\databases"
            included = $IncludeDatabases
            files = if ($IncludeDatabases) { $dbCount } else { 0 }
            size = if ($IncludeDatabases) { $dbSize } else { 0 }
        }
        learning = @{
            path = "D:\learning-system"
            included = $IncludeLearning
            files = if ($IncludeLearning) { $learningCount } else { 0 }
            size = if ($IncludeLearning) { $learningSize } else { 0 }
        }
    }
    tag = $Tag
}

$metadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$snapshotPath\metadata.json" -Encoding UTF8

# ============================================================================
# UPDATE CHANGELOG
# ============================================================================
$changelogPath = "$RepoPath\logs\CHANGELOG.md"
$changelogEntry = @"

## [$snapshotId] - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") [FULL SNAPSHOT]

**Branch:** $Branch
**Description:** $Description
**Type:** Full System Snapshot (Code + Data)

**Components:**
- Workspace (C:\dev): $workspaceCount files ($([math]::Round($workspaceSize / 1MB, 2)) MB)
$(if ($IncludeDatabases) { "- Databases (D:\databases): $dbCount files ($([math]::Round($dbSize / 1MB, 2)) MB)" })
$(if ($IncludeLearning) { "- Learning (D:\learning-system): $learningCount files ($([math]::Round($learningSize / 1MB, 2)) MB)" })

**Total:** $totalFiles files
**Size:** $([math]::Round($totalSize / 1MB, 2)) MB → $([math]::Round($finalSize / 1MB, 2)) MB (compressed)
**Author:** $env:USERNAME
$(if ($Tag) { "**Tag:** $Tag" })

---

"@

$changelogEntry | Add-Content -Path $changelogPath -Encoding UTF8

# ============================================================================
# UPDATE BRANCH METADATA
# ============================================================================
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

# ============================================================================
# CREATE TAG (if specified)
# ============================================================================
if ($Tag) {
    $tagPath = "$RepoPath\tags\$Tag"
    New-Item -Path $tagPath -ItemType Directory -Force | Out-Null

    $tagMetadata = @{
        name = $Tag
        snapshotId = $snapshotId
        branch = $Branch
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        description = $Description
        snapshotType = "full"
    }

    $tagMetadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$tagPath\metadata.json" -Encoding UTF8
    New-Item -ItemType SymbolicLink -Path "$tagPath\snapshot" -Target $snapshotPath -Force -ErrorAction SilentlyContinue | Out-Null

    Write-Success "Tagged as: $Tag"
}

# ============================================================================
# UPDATE REPOSITORY STATUS
# ============================================================================
$status = @{
    initialized = $true
    lastChecked = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    currentBranch = $Branch
    lastSnapshot = $snapshotId
    lastSnapshotType = "full"
    snapshotCount = (Get-ChildItem "$RepoPath\snapshots" -Directory).Count
    totalSize = "$([math]::Round((Get-ChildItem "$RepoPath\snapshots" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB, 2)) GB"
}

$status | ConvertTo-Json -Depth 10 | Set-Content -Path $statusPath -Encoding UTF8

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║           FULL SNAPSHOT CREATED SUCCESSFULLY!              ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nSnapshot ID:      " -NoNewline; Write-Host $snapshotId -ForegroundColor Yellow
Write-Host "Branch:           " -NoNewline; Write-Host $Branch -ForegroundColor Cyan
if ($Tag) {
    Write-Host "Tag:              " -NoNewline; Write-Host $Tag -ForegroundColor Magenta
}
Write-Host "`nTotal Files:      " -NoNewline; Write-Host "$totalFiles files" -ForegroundColor White
Write-Host "Original Size:    " -NoNewline; Write-Host "$([math]::Round($totalSize / 1GB, 2)) GB" -ForegroundColor White
Write-Host "Compressed Size:  " -NoNewline; Write-Host "$([math]::Round($finalSize / 1MB, 2)) MB" -ForegroundColor Green
Write-Host "Compression:      " -NoNewline; Write-Host "$([math]::Round((1 - ($finalSize / $totalSize)) * 100, 1))% smaller" -ForegroundColor Green

Write-Host "`nComponents:" -ForegroundColor Cyan
Write-Host "  • Workspace:    " -NoNewline; Write-Host "$workspaceCount files" -ForegroundColor Gray
if ($IncludeDatabases) {
    Write-Host "  • Databases:    " -NoNewline; Write-Host "$dbCount files" -ForegroundColor Gray
}
if ($IncludeLearning) {
    Write-Host "  • Learning:     " -NoNewline; Write-Host "$learningCount files" -ForegroundColor Gray
}

Write-Host "`nLocation: " -NoNewline; Write-Host $snapshotPath -ForegroundColor DarkGray

Write-Host "`n✓ Full system snapshot saved successfully!`n" -ForegroundColor Green
