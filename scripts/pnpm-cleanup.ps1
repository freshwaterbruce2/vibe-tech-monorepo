# pnpm Cleanup Script
# Simple, tested version

param([switch]$DryRun)

$RootDir = "C:\dev"
$environmentScript = Join-Path $PSScriptRoot 'Initialize-DevProcessEnvironment.ps1'

. $environmentScript
$null = Initialize-DevProcessEnvironment

Write-Host "=== pnpm Cleanup ===" -ForegroundColor Cyan

# Find node_modules
Write-Host "Finding node_modules..." -ForegroundColor Yellow
$dirs = @()

if (Test-Path "$RootDir\node_modules") { $dirs += "$RootDir\node_modules" }

$searchPaths = @("apps", "packages", "backend")
foreach ($path in $searchPaths) {
    $fullPath = Join-Path $RootDir $path
    if (Test-Path $fullPath) {
        Get-ChildItem -Path $fullPath -Recurse -Directory -Filter "node_modules" -Depth 2 -ErrorAction SilentlyContinue | ForEach-Object {
            $dirs += $_.FullName
        }
    }
}

Write-Host "Found $($dirs.Count) directories" -ForegroundColor Cyan

# Calculate size
Write-Host "Calculating size..." -ForegroundColor Yellow
$totalSize = 0
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($size) { $totalSize += $size }
    }
}
$sizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "Total: $sizeGB GB" -ForegroundColor Cyan

# Remove or preview
if ($DryRun) {
    Write-Host "`nDRY RUN - Would delete:" -ForegroundColor Magenta
    $dirs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "`nRemoving..." -ForegroundColor Yellow
    foreach ($dir in $dirs) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Removed $sizeGB GB" -ForegroundColor Green

    Write-Host "`nPruning pnpm store..." -ForegroundColor Yellow
    pnpm store prune

    Write-Host "`nReinstalling..." -ForegroundColor Yellow
    Set-Location $RootDir
    pnpm install --recursive

    Write-Host "`nDone!" -ForegroundColor Green
}
