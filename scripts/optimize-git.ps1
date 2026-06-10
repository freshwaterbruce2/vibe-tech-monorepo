#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Applies advanced Git performance configurations for the VibeTech monorepo.
.DESCRIPTION
    Runs inside the V:\monorepo directory. Measures baseline git status speed,
    applies targeted performance optimizations, sets up background maintenance,
    and measures optimized git status speed.
#>

$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         VibeTech Git Performance Optimizer              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure we are in V:\monorepo
if ((Get-Location).Path -notlike "*V:\monorepo*") {
    Write-Warning "This script is designed to run within V:\monorepo."
    $response = Read-Host "Do you want to continue running this in $((Get-Location).Path)? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# 1. Measure Baseline Speed
Write-Host "[*] Measuring baseline 'git status' speed..." -ForegroundColor Yellow
$baselineTimes = @()
for ($i = 1; $i -le 3; $i++) {
    $time = Measure-Command { git status > $null }
    $baselineTimes += $time.TotalMilliseconds
    $currentRun = $i
    Write-Host "  Run $($currentRun): $($time.TotalMilliseconds) ms" -ForegroundColor Gray
}
$avgBaseline = ($baselineTimes | Measure-Object -Average).Average
Write-Host "[+] Baseline average speed: $avgBaseline ms" -ForegroundColor Green

# 2. Applying Optimizations
Write-Host "`n[*] Applying Git configuration optimizations..." -ForegroundColor Yellow

# Enable background file monitor daemon (avoids full disk sweeps)
git config --local core.fsmonitor true
Write-Host "  [x] core.fsmonitor = true" -ForegroundColor Gray

# Enable Windows file system caching for Git
git config --local core.fscache true
Write-Host "  [x] core.fscache = true" -ForegroundColor Gray

# Parallelize index updates
git config --local core.preloadindex true
Write-Host "  [x] core.preloadindex = true" -ForegroundColor Gray

# Cache status of untracked files
git config --local core.untrackedCache true
Write-Host "  [x] core.untrackedCache = true" -ForegroundColor Gray

# Configure Git for repositories with many files
git config --local feature.manyFiles true
Write-Host "  [x] feature.manyFiles = true" -ForegroundColor Gray

# Safeguard RAM usage during pack generation
git config --local pack.windowMemory 1g
git config --local pack.packSizeLimit 2g
Write-Host "  [x] pack.windowMemory = 1g, pack.packSizeLimit = 2g" -ForegroundColor Gray

# Clean up invalid legacy hookspath pointing to deleted V:\monorepo
$legacyHooks = git config --local core.hookspath 2>$null
if ($legacyHooks) {
    if ($legacyHooks -like "*V:\monorepo*") {
        Write-Host "  [-] Found invalid core.hookspath ($legacyHooks). Resetting it to default..." -ForegroundColor Yellow
        git config --local --unset core.hookspath
        Write-Host "  [x] core.hookspath unset (will default to relative .git/hooks)" -ForegroundColor Gray
    } else {
        Write-Host "  [x] core.hookspath is currently set to: $legacyHooks" -ForegroundColor Gray
    }
} else {
    Write-Host "  [x] core.hookspath is unset (defaults to relative .git/hooks)" -ForegroundColor Gray
}

# Use index version 4 (supports path compression)
Write-Host "[*] Upgrading git index to version 4 (path compression)..." -ForegroundColor Yellow
git update-index --index-version 4

# Write / refresh the commit-graph for history performance
Write-Host "[*] Computing and writing commit-graph..." -ForegroundColor Yellow
git commit-graph write --reachable

# Register repository with Git background maintenance
Write-Host "[*] Initializing background git maintenance..." -ForegroundColor Yellow
git maintenance start

# 3. Measure Optimized Speed
Write-Host "`n[*] Measuring optimized 'git status' speed..." -ForegroundColor Yellow
$optimizedTimes = @()
for ($i = 1; $i -le 3; $i++) {
    $time = Measure-Command { git status > $null }
    $optimizedTimes += $time.TotalMilliseconds
    $currentRun = $i
    Write-Host "  Run $($currentRun): $($time.TotalMilliseconds) ms" -ForegroundColor Gray
}
$avgOptimized = ($optimizedTimes | Measure-Object -Average).Average
Write-Host "[+] Optimized average speed: $avgOptimized ms" -ForegroundColor Green

# 4. Report Gains
$gainMs = $avgBaseline - $avgOptimized
$percent = ($gainMs / $avgBaseline) * 100
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "                  OPTIMIZATION RESULTS                    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Average Baseline:  $avgBaseline ms"
Write-Host "  Average Optimized: $avgOptimized ms"
Write-Host "  Time Saved:        $gainMs ms ($([math]::Round($percent, 2))% faster)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
