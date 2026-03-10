<#
.SYNOPSIS
    Analyzes a drive or directory for cleanup opportunities.
    Non-destructive. Generates a CSV report.

.DESCRIPTION
    Scans the specified path (default D:\) for:
    1. Space Hogs (Top 50 largest files).
    2. Zombie Folders (Empty or node_modules > 1 year).
    3. Duplicates (Name + Size match).
    4. Root Chaos (Loose files in root).

.EXAMPLE
    .\analyze_drive.ps1 -RootPath "D:\" -ReportPath "C:\dev\admin_scripts\drive_report.txt"
#>

param (
    [string]$RootPath = "D:\",
    [string]$ReportPath = "C:\dev\admin_scripts\drive_report.csv"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Starting Analysis of $RootPath..." -ForegroundColor Cyan
Write-Host "This may take a few minutes."

# Exclusions
$ExcludedFolders = @(
    '$Recycle.Bin',
    'System Volume Information',
    'WindowsApps',
    'Program Files',
    'WpSystem',
    'Recovery',
    'wuDownloadCache',
    'databases',
    'learning-system'
)

# 1. Root Chaos Analysis
Write-Host "`n[1/4] Analyzing Root Chaos..." -ForegroundColor Yellow
$RootItems = Get-ChildItem -Path $RootPath -File
$RootChaos = $RootItems | Select-Object Name, Length, LastWriteTime, @{N = 'Type'; E = { 'RootFile' } }

# 2. Key Metrics & Space Hogs
Write-Host "[2/4] Scanning files (Top 50 Space Hogs)..." -ForegroundColor Yellow

# Helper to recurse safely
function Get-AllFiles {
    param ($Path)
    $files = New-Object System.Collections.Generic.List[PSObject]

    try {
        $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            if ($item.PSIsContainer) {
                if ($ExcludedFolders -notcontains $item.Name) {
                    $files.AddRange((Get-AllFiles -Path $item.FullName))
                }
            }
            else {
                $files.Add($item)
            }
        }
    }
    catch {
        Write-Warning "Access Denied: $Path"
    }
    return $files
}

# Just using Get-ChildItem -Recurse for standard depth is faster but less granular on errors.
# For D:\ which works with standard permissions often, let's try standard Recurse with exclusion logic.

$AllFiles = Get-ChildItem -Path $RootPath -Recurse -File -Force -ErrorAction SilentlyContinue |
Where-Object {
    $path = $_.FullName
    $exclude = $false
    foreach ($ex in $ExcludedFolders) {
        if ($path -match [Regex]::Escape($ex)) { $exclude = $true; break }
    }
    -not $exclude
}

$Top50 = $AllFiles | Sort-Object Length -Descending | Select-Object -First 50 |
Select-Object Name, @{N = 'SizeMB'; E = { "{0:N2}" -f ($_.Length / 1MB) } }, DirectoryName, @{N = 'Type'; E = { 'SpaceHog' } }

# 3. Zombie Folders (Empty or Old node_modules)
Write-Host "[3/4] Finding Zombie Folders..." -ForegroundColor Yellow
$Folders = Get-ChildItem -Path $RootPath -Recurse -Directory -Force -ErrorAction SilentlyContinue |
Where-Object {
    $path = $_.FullName
    $exclude = $false
    foreach ($ex in $ExcludedFolders) {
        if ($path -match [Regex]::Escape($ex)) { $exclude = $true; break }
    }
    -not $exclude
}

$Zombies = @()
foreach ($folder in $Folders) {
    # Check Empty
    $count = (Get-ChildItem $folder.FullName -Force -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($count -eq 0) {
        $Zombies += [PSCustomObject]@{
            Name          = $folder.Name
            SizeMB        = 0
            DirectoryName = $folder.FullName
            Type          = 'Zombie - Empty'
        }
    }
    # Check Old node_modules
    elseif ($folder.Name -eq 'node_modules') {
        if ($folder.LastWriteTime -lt (Get-Date).AddYears(-1)) {
            $Zombies += [PSCustomObject]@{
                Name          = $folder.Name
                SizeMB        = "Unknown"
                DirectoryName = $folder.FullName
                Type          = 'Zombie - Old node_modules'
            }
        }
    }
}

# 4. Duplicates (Name + Size)
Write-Host "[4/4] Detecting Duplicates..." -ForegroundColor Yellow
$Duplicates = $AllFiles | Group-Object Name, Length | Where-Object Count -gt 1 |
ForEach-Object {
    $_.Group | Select-Object Name, @{N = 'SizeMB'; E = { "{0:N2}" -f ($_.Length / 1MB) } }, DirectoryName, @{N = 'Type'; E = { 'Duplicate' } }
}

# Combine and Export
Write-Host "Exporting Report to $ReportPath..." -ForegroundColor Green

$ReportData = @()
$ReportData += $Top50
$ReportData += $Zombies
$ReportData += $Duplicates
$ReportData += $RootChaos | Select-Object Name, @{N = 'SizeMB'; E = { "{0:N2}" -f ($_.Length / 1MB) } }, @{N = 'DirectoryName'; E = { $RootPath } }, @{N = 'Type'; E = { 'RootFile' } }

$ReportData | Export-Csv -Path $ReportPath -NoTypeInformation

Write-Host "Analysis Complete!" -ForegroundColor Cyan
