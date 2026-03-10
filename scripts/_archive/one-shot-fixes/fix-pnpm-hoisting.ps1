#Requires -Version 7.0
<#
.SYNOPSIS
    Fix pnpm hoisting by removing all node_modules and reinstalling
.DESCRIPTION
    Consolidates 40 separate node_modules directories into root hoisted structure
    Saves ~1.4GB disk space and improves build performance
.NOTES
    Date: 2026-01-25
    Prerequisites: D:\ snapshot already created
#>

param(
    [switch]$SkipStoreClean,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 pnpm Hoisting Fix Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verify we're in the right directory
if (-not (Test-Path "pnpm-workspace.yaml")) {
    Write-Error "❌ Must run from C:\dev (pnpm workspace root)"
    exit 1
}

# Check pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "❌ pnpm not found. Install with: npm install -g pnpm@latest"
    exit 1
}

Write-Host "✅ Prerequisites verified`n"

# Step 1: Count current node_modules
Write-Host "📊 Current State:" -ForegroundColor Yellow
$appNodeModules = Get-ChildItem -Path "apps" -Directory -Recurse -Depth 2 -Filter "node_modules" -ErrorAction SilentlyContinue
$pkgNodeModules = Get-ChildItem -Path "packages" -Directory -Recurse -Depth 2 -Filter "node_modules" -ErrorAction SilentlyContinue
$totalDirs = $appNodeModules.Count + $pkgNodeModules.Count

Write-Host "  • App node_modules: $($appNodeModules.Count)"
Write-Host "  • Package node_modules: $($pkgNodeModules.Count)"
Write-Host "  • Total to remove: $totalDirs`n"

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made`n" -ForegroundColor Yellow

    Write-Host "Would remove:" -ForegroundColor Yellow
    $appNodeModules | ForEach-Object { Write-Host "  - $($_.FullName -replace 'C:\\dev\\', '')" }
    $pkgNodeModules | ForEach-Object { Write-Host "  - $($_.FullName -replace 'C:\\dev\\', '')" }

    Write-Host "`nWould also remove:" -ForegroundColor Yellow
    Write-Host "  - pnpm-lock.yaml"
    Write-Host "  - node_modules/.modules.yaml"

    if (-not $SkipStoreClean) {
        Write-Host "`nWould run: pnpm store prune"
    }

    Write-Host "`nWould run: pnpm install --force`n"
    exit 0
}

# Step 2: Remove all app/package node_modules
Write-Host "🗑️  Removing app/package node_modules..." -ForegroundColor Yellow
$appNodeModules | ForEach-Object {
    Write-Host "  Removing: $($_.FullName -replace 'C:\\dev\\', '')"
    Remove-Item -Path $_.FullName -Recurse -Force
}
$pkgNodeModules | ForEach-Object {
    Write-Host "  Removing: $($_.FullName -replace 'C:\\dev\\', '')"
    Remove-Item -Path $_.FullName -Recurse -Force
}

Write-Host "✅ Removed $totalDirs node_modules directories`n"

# Step 3: Remove pnpm-lock.yaml
Write-Host "🗑️  Removing pnpm-lock.yaml..." -ForegroundColor Yellow
if (Test-Path "pnpm-lock.yaml") {
    Remove-Item "pnpm-lock.yaml" -Force
    Write-Host "✅ Removed pnpm-lock.yaml`n"
} else {
    Write-Host "⚠️  pnpm-lock.yaml not found (already removed?)`n" -ForegroundColor Yellow
}

# Step 4: Remove root node_modules metadata
Write-Host "🗑️  Cleaning root node_modules metadata..." -ForegroundColor Yellow
if (Test-Path "node_modules/.modules.yaml") {
    Remove-Item "node_modules/.modules.yaml" -Force
    Write-Host "✅ Removed .modules.yaml`n"
}

# Step 5: Prune pnpm store (optional)
if (-not $SkipStoreClean) {
    Write-Host "🧹 Pruning pnpm store..." -ForegroundColor Yellow
    pnpm store prune
    Write-Host "✅ Store pruned`n"
} else {
    Write-Host "⏭️  Skipping store prune (--SkipStoreClean)`n" -ForegroundColor Yellow
}

# Step 6: Fresh install with hoisting
Write-Host "📦 Reinstalling with hoisting..." -ForegroundColor Green
Write-Host "   (This will take 5-10 minutes)`n"

$installStart = Get-Date
pnpm install --force
$installEnd = Get-Date
$installTime = ($installEnd - $installStart).TotalSeconds

Write-Host "`n✅ Installation complete in $([math]::Round($installTime, 1))s`n" -ForegroundColor Green

# Step 7: Verify results
Write-Host "🔍 Verifying hoisting..." -ForegroundColor Cyan
$afterAppNodeModules = Get-ChildItem -Path "apps" -Directory -Recurse -Depth 2 -Filter "node_modules" -ErrorAction SilentlyContinue
$afterPkgNodeModules = Get-ChildItem -Path "packages" -Directory -Recurse -Depth 2 -Filter "node_modules" -ErrorAction SilentlyContinue
$afterTotal = $afterAppNodeModules.Count + $afterPkgNodeModules.Count

Write-Host "`n📊 Results:" -ForegroundColor Green
Write-Host "  • Before: $totalDirs node_modules directories"
Write-Host "  • After: $afterTotal node_modules directories"
Write-Host "  • Removed: $($totalDirs - $afterTotal) directories"

if ($afterTotal -gt 5) {
    Write-Host "`n⚠️  WARNING: More than 5 app/package node_modules still exist" -ForegroundColor Yellow
    Write-Host "   This may indicate version conflicts or native modules`n"

    Write-Host "Remaining directories:"
    $afterAppNodeModules | ForEach-Object { Write-Host "  - $($_.FullName -replace 'C:\\dev\\', '')" }
    $afterPkgNodeModules | ForEach-Object { Write-Host "  - $($_.FullName -replace 'C:\\dev\\', '')" }
} else {
    Write-Host "`n✅ Hoisting successful! $afterTotal directories remaining (acceptable)" -ForegroundColor Green
}

# Check root node_modules size
$rootSize = (Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "`n📦 Root node_modules size: $([math]::Round($rootSize, 2))GB`n"

Write-Host "🎉 pnpm hoisting fix complete!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan
