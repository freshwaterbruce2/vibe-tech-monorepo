# Cleanup and Reinstall Script for pnpm Monorepo
# Last Updated: 2026-02-03
# Purpose: Deep clean node_modules and reinstall with pnpm

param(
    [switch]$DryRun = $false,
    [switch]$SkipBackup = $false
)

Write-Host "=== pnpm Monorepo Cleanup and Reinstall ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$RootDir = "C:\dev"

# Step 1: Create backup snapshot (unless skipped)
if (-not $SkipBackup) {
    Write-Host "[1/6] Creating D:\ snapshot for safety..." -ForegroundColor Yellow
    $snapshotScript = Join-Path $RootDir "scripts\version-control\Save-Snapshot.ps1"
    if (Test-Path $snapshotScript) {
        & $snapshotScript -Description "Before pnpm cleanup and reinstall"
        Write-Host "  ✓ Snapshot created" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Snapshot script not found, skipping backup" -ForegroundColor Yellow
    }
} else {
    Write-Host "[1/6] Backup skipped (SkipBackup flag set)" -ForegroundColor Yellow
}

# Step 2: Find all node_modules directories
Write-Host "[2/6] Finding all node_modules directories..." -ForegroundColor Yellow
$nodeModulesDirs = @()

# Root node_modules
if (Test-Path "$RootDir\node_modules") {
    $nodeModulesDirs += "$RootDir\node_modules"
}

# Apps, packages, backend
$searchPaths = @("apps", "packages", "backend")
foreach ($searchPath in $searchPaths) {
    $fullPath = Join-Path $RootDir $searchPath
    if (Test-Path $fullPath) {
        Get-ChildItem -Path $fullPath -Recurse -Directory -Filter "node_modules" -Depth 2 -ErrorAction SilentlyContinue | ForEach-Object {
            $nodeModulesDirs += $_.FullName
        }
    }
}

Write-Host "  Found $($nodeModulesDirs.Count) node_modules directories" -ForegroundColor Cyan
$nodeModulesDirs | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }

# Step 3: Calculate size before cleanup
Write-Host "[3/6] Calculating current disk usage..." -ForegroundColor Yellow
$totalSize = 0
foreach ($dir in $nodeModulesDirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($null -ne $size) {
            $totalSize += $size
        }
    }
}
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "  Total size: $totalSizeGB GB" -ForegroundColor Cyan

# Step 4: Remove node_modules (or dry run)
Write-Host "[4/6] Removing node_modules directories..." -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "  DRY RUN MODE - Would delete:" -ForegroundColor Magenta
    $nodeModulesDirs | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
} else {
    $removedCount = 0
    foreach ($dir in $nodeModulesDirs) {
        if (Test-Path $dir) {
            Write-Host "  Removing: $dir" -ForegroundColor Gray
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            $removedCount++
        }
    }
    Write-Host "  ✓ Removed $removedCount directories" -ForegroundColor Green
    Write-Host "  ✓ Freed up $totalSizeGB GB of disk space" -ForegroundColor Green
}

# Step 5: Clean pnpm store (optional)
Write-Host "[5/6] Cleaning pnpm store..." -ForegroundColor Yellow
if (-not $DryRun) {
    Write-Host "  Running: pnpm store prune" -ForegroundColor Gray
    & pnpm store prune
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ pnpm store pruned" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Failed to prune store (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  DRY RUN - Would run: pnpm store prune" -ForegroundColor Magenta
}

# Step 6: Fresh install
Write-Host "[6/6] Running fresh pnpm install..." -ForegroundColor Yellow
if (-not $DryRun) {
    Set-Location $RootDir
    Write-Host "  Running: pnpm install --recursive" -ForegroundColor Gray
    & pnpm install --recursive
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Fresh install complete" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Install failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  DRY RUN - Would run: pnpm install --recursive" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "This was a DRY RUN. Run again without -DryRun to execute." -ForegroundColor Magenta
} else {
    Write-Host "✓ Cleanup successful" -ForegroundColor Green
    Write-Host "✓ Fresh dependencies installed" -ForegroundColor Green
    Write-Host "✓ Freed up $totalSizeGB GB" -ForegroundColor Green
}
