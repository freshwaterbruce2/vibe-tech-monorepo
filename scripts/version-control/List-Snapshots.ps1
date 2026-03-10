#Requires -Version 7.0

<#
.SYNOPSIS
    List all snapshots (like git log)

.DESCRIPTION
    Displays snapshot history with descriptions, dates, and metadata.

.PARAMETER Limit
    Number of snapshots to show (default: 10, 0 = all)

.PARAMETER Branch
    Filter by branch name

.PARAMETER Tag
    Show only tagged snapshots

.EXAMPLE
    .\List-Snapshots.ps1
    .\List-Snapshots.ps1 -Limit 20
    .\List-Snapshots.ps1 -Branch "main"
    .\List-Snapshots.ps1 -Tag

.NOTES
    Similar to: git log
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [int]$Limit = 10,

    [Parameter(Mandatory = $false)]
    [string]$Branch,

    [Parameter(Mandatory = $false)]
    [switch]$Tag,

    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "D:\repositories\vibetech"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Check if repository exists
if (-not (Test-Path "$RepoPath\snapshots")) {
    Write-Host "❌ No snapshots found. Repository may not be initialized." -ForegroundColor Red
    exit 1
}

# Get all snapshots
$snapshots = Get-ChildItem "$RepoPath\snapshots" -Directory | Sort-Object Name -Descending

if ($snapshots.Count -eq 0) {
    Write-Host "No snapshots found. Create your first snapshot with:`n" -ForegroundColor Yellow
    Write-Host "  .\Save-Snapshot.ps1 -Description `"Initial state`"`n" -ForegroundColor Gray
    exit 0
}

# Apply filters
if ($Branch) {
    $snapshots = $snapshots | Where-Object {
        $metadataPath = "$($_.FullName)\metadata.json"
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            $metadata.branch -eq $Branch
        }
    }
}

if ($Tag) {
    $snapshots = $snapshots | Where-Object {
        $metadataPath = "$($_.FullName)\metadata.json"
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            $null -ne $metadata.tag
        }
    }
}

# Apply limit
if ($Limit -gt 0) {
    $snapshots = $snapshots | Select-Object -First $Limit
}

# Display header
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Snapshot History" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($Branch) {
    Write-Host "Branch: $Branch`n" -ForegroundColor Yellow
}

# Display snapshots
foreach ($snapshot in $snapshots) {
    $metadataPath = "$($snapshot.FullName)\metadata.json"

    if (Test-Path $metadataPath) {
        $metadata = Get-Content $metadataPath | ConvertFrom-Json

        Write-Host "Snapshot: " -NoNewline -ForegroundColor White
        Write-Host $metadata.snapshotId -ForegroundColor Yellow

        Write-Host "Date:     " -NoNewline -ForegroundColor White
        Write-Host $metadata.timestamp -ForegroundColor Gray

        Write-Host "Branch:   " -NoNewline -ForegroundColor White
        Write-Host $metadata.branch -ForegroundColor Cyan

        if ($metadata.tag) {
            Write-Host "Tag:      " -NoNewline -ForegroundColor White
            Write-Host $metadata.tag -ForegroundColor Magenta
        }

        Write-Host "Author:   " -NoNewline -ForegroundColor White
        Write-Host $metadata.author -ForegroundColor Gray

        Write-Host "Files:    " -NoNewline -ForegroundColor White
        Write-Host "$($metadata.fileCount) files" -ForegroundColor Gray

        Write-Host "Size:     " -NoNewline -ForegroundColor White
        Write-Host "$([math]::Round($metadata.compressedSize / 1MB, 2)) MB" -ForegroundColor Gray

        Write-Host "`n  " -NoNewline
        Write-Host $metadata.description -ForegroundColor White

        Write-Host "`n$('-' * 60)`n" -ForegroundColor DarkGray
    }
}

# Summary
Write-Host "Total snapshots: " -NoNewline
Write-Host $snapshots.Count -ForegroundColor Yellow

$totalSize = ($snapshots | ForEach-Object {
        $metadataPath = "$($_.FullName)\metadata.json"
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            $metadata.compressedSize
        }
    } | Measure-Object -Sum).Sum

Write-Host "Total size:      " -NoNewline
Write-Host "$([math]::Round($totalSize / 1GB, 2)) GB`n" -ForegroundColor Yellow

# Show restore command
Write-Host "To restore a snapshot:`n" -ForegroundColor Cyan
Write-Host "  .\Restore-Snapshot.ps1 -SnapshotId <ID>`n" -ForegroundColor Gray
