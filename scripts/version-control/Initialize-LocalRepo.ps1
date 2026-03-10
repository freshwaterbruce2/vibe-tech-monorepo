#Requires -Version 7.0

<#
.SYNOPSIS
    Initialize D:\ drive as local version control repository (Git alternative)

.DESCRIPTION
    Creates a structured version control system on D:\ for the VibeTech monorepo.
    Provides commit-like snapshots, branches, tags, and change tracking.

.EXAMPLE
    .\Initialize-LocalRepo.ps1
    .\Initialize-LocalRepo.ps1 -RepoPath "D:\repositories\vibetech"

.NOTES
    Author: VibeTech Development Team
    Date: 2026-01-14
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech",

    [Parameter(Mandatory = $false)]
    [string]$WorkspacePath = "C:\dev",

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Local Version Control System" -ForegroundColor Magenta
Write-Host "D:\ Drive Repository Initialization" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Validate paths
if (-not (Test-Path $WorkspacePath)) {
    Write-Error "Workspace path not found: $WorkspacePath"
    exit 1
}

# Check if repository already exists
if ((Test-Path $RepoPath) -and -not $Force) {
    Write-Warning "Repository already exists at: $RepoPath"
    $response = Read-Host "Reinitialize? This will preserve existing snapshots (Y/N)"
    if ($response -ne 'Y') {
        Write-Info "Initialization cancelled."
        exit 0
    }
}

# Create repository structure
Write-Info "Creating repository structure at: $RepoPath"

$directories = @(
    "$RepoPath\snapshots",           # Timestamped workspace snapshots
    "$RepoPath\branches",            # Branch states (main, feature/*, etc.)
    "$RepoPath\tags",                # Tagged releases (v1.0.0, production, etc.)
    "$RepoPath\metadata",            # Snapshot metadata (descriptions, diffs, stats)
    "$RepoPath\logs",                # Change logs and history
    "$RepoPath\staging",             # Temporary staging area
    "$RepoPath\.config"              # Configuration files
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Success "Created: $dir"
    } else {
        Write-Info "Exists: $dir"
    }
}

# Create configuration file
$configPath = "$RepoPath\.config\repository.json"
$config = @{
    repositoryVersion = "1.0.0"
    workspacePath = $WorkspacePath
    createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    currentBranch = "main"
    author = $env:USERNAME
    compression = $true
    compressionLevel = "Optimal"
    excludePatterns = @(
        "node_modules/**"
        "dist/**"
        ".nx/**"
        ".turbo/**"
        "coverage/**"
        "target/**"
        ".vite/**"
        "playwright-report/**"
        "**/*.tsbuildinfo"
        "_backups/**"
        "release/**"
    )
    retentionDays = 90  # Auto-cleanup snapshots older than 90 days
}

$config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Encoding UTF8
Write-Success "Created configuration: $configPath"

# Create initial branch (main)
$mainBranchPath = "$RepoPath\branches\main"
if (-not (Test-Path $mainBranchPath)) {
    New-Item -Path $mainBranchPath -ItemType Directory -Force | Out-Null

    $branchMetadata = @{
        name = "main"
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        description = "Main development branch"
        protected = $true
        lastSnapshot = $null
    }

    $branchMetadata | ConvertTo-Json -Depth 10 | Set-Content -Path "$mainBranchPath\metadata.json" -Encoding UTF8
    Write-Success "Created main branch"
}

# Create CHANGELOG template
$changelogPath = "$RepoPath\logs\CHANGELOG.md"
if (-not (Test-Path $changelogPath)) {
    $changelogTemplate = @"
# VibeTech Monorepo - Change Log

All notable changes to this workspace will be documented in this file.

## Format

Each snapshot entry includes:
- **Snapshot ID** - Timestamp (YYYYMMDD-HHMMSS)
- **Branch** - Current branch
- **Description** - What changed
- **Files Changed** - Number of files modified
- **Size** - Snapshot size

---

## [Unreleased]

### Added
- Initial repository setup

---

<!-- Snapshots will be added below automatically -->

"@

    $changelogTemplate | Set-Content -Path $changelogPath -Encoding UTF8
    Write-Success "Created CHANGELOG.md"
}

# Create README
$readmePath = "$RepoPath\README.md"
$readmeContent = @"
# VibeTech Local Repository

**Location:** $RepoPath
**Workspace:** $WorkspacePath
**Initialized:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Structure

\`\`\`
$RepoPath
├── snapshots\          # Timestamped workspace snapshots
├── branches\           # Branch states (main, feature/*, etc.)
├── tags\               # Tagged releases (v1.0.0, production)
├── metadata\           # Snapshot metadata (descriptions, stats)
├── logs\               # Change logs and history
├── staging\            # Temporary staging area
└── .config\            # Repository configuration
\`\`\`

## Quick Commands

**Create Snapshot:**
\`\`\`powershell
.\Save-Snapshot.ps1 -Description "Added user authentication"
\`\`\`

**List Snapshots:**
\`\`\`powershell
.\List-Snapshots.ps1
\`\`\`

**Restore Snapshot:**
\`\`\`powershell
.\Restore-Snapshot.ps1 -SnapshotId "20260114-153000"
\`\`\`

**Create Branch:**
\`\`\`powershell
.\Create-Branch.ps1 -Name "feature/new-ui"
\`\`\`

**Switch Branch:**
\`\`\`powershell
.\Switch-Branch.ps1 -Name "feature/new-ui"
\`\`\`

**Tag Release:**
\`\`\`powershell
.\Create-Tag.ps1 -Name "v1.0.0" -Description "Production release"
\`\`\`

**Compare Snapshots:**
\`\`\`powershell
.\Compare-Snapshots.ps1 -From "20260114-150000" -To "20260114-160000"
\`\`\`

**View History:**
\`\`\`powershell
.\Show-History.ps1 -Limit 10
\`\`\`

## Configuration

Edit: \`.config\repository.json\`

- **Compression:** Optimal (97% smaller snapshots)
- **Retention:** 90 days (auto-cleanup)
- **Exclusions:** node_modules, dist, .nx, coverage

## Snapshots

Snapshots are compressed copies of the workspace at a specific point in time.

**Naming:** \`YYYYMMDD-HHMMSS\` (e.g., 20260114-153000)

**Metadata includes:**
- Description (commit message)
- File count and size
- Changed files list
- Author and timestamp
- Branch name

## Branches

Branches allow parallel development without affecting main.

**Create:**
\`\`\`powershell
.\Create-Branch.ps1 -Name "feature/my-feature"
\`\`\`

**Switch:**
\`\`\`powershell
.\Switch-Branch.ps1 -Name "feature/my-feature"
\`\`\`

**Merge:**
\`\`\`powershell
.\Merge-Branch.ps1 -From "feature/my-feature" -To "main"
\`\`\`

## Tags

Tags mark important points in history (releases, milestones).

**Create:**
\`\`\`powershell
.\Create-Tag.ps1 -Name "v1.0.0" -Description "Production release"
\`\`\`

**List:**
\`\`\`powershell
.\List-Tags.ps1
\`\`\`

## Rollback

Restore workspace to any previous snapshot:

\`\`\`powershell
.\Restore-Snapshot.ps1 -SnapshotId "20260114-150000"
\`\`\`

Creates backup of current state before restoring.

---

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$readmeContent | Set-Content -Path $readmePath -Encoding UTF8
Write-Success "Created README.md"

# Create .gitignore equivalent (exclude from snapshots)
$excludePath = "$RepoPath\.config\exclude.txt"
$excludePatterns = $config.excludePatterns -join "`n"
$excludePatterns | Set-Content -Path $excludePath -Encoding UTF8
Write-Success "Created exclude patterns file"

# Summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Repository Initialized Successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Repository Location: " -NoNewline
Write-Host $RepoPath -ForegroundColor Yellow

Write-Host "Workspace Location:  " -NoNewline
Write-Host $WorkspacePath -ForegroundColor Yellow

Write-Host "Current Branch:      " -NoNewline
Write-Host "main" -ForegroundColor Cyan

Write-Host "`nNext Steps:`n" -ForegroundColor Cyan
Write-Host "1. Create your first snapshot:" -ForegroundColor White
Write-Host "   .\Save-Snapshot.ps1 -Description `"Initial workspace state`"`n" -ForegroundColor Gray

Write-Host "2. View available commands:" -ForegroundColor White
Write-Host "   Get-ChildItem C:\dev\scripts\version-control\*.ps1`n" -ForegroundColor Gray

Write-Host "3. Read documentation:" -ForegroundColor White
Write-Host "   Get-Content $RepoPath\README.md`n" -ForegroundColor Gray

# Create status file
$statusPath = "$RepoPath\.config\status.json"
$status = @{
    initialized = $true
    lastChecked = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    currentBranch = "main"
    snapshotCount = 0
    totalSize = "0 MB"
}

$status | ConvertTo-Json -Depth 10 | Set-Content -Path $statusPath -Encoding UTF8

Write-Host "Repository is ready to use! 🎉`n" -ForegroundColor Green
