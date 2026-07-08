# Quick Cleanup Script for C:\ Drive Space
# Run this whenever you need to free up space

param(
    [switch]$Auto = $false
)

Write-Host "`n=== QUICK DISK CLEANUP ===" -ForegroundColor Cyan
Write-Host "This will clean development files that can be regenerated" -ForegroundColor Gray
Write-Host ""

# Check current space
$cDrive = Get-PSDrive C
$cFreeGB = [math]::Round($cDrive.Free/1GB, 2)
$cUsedGB = [math]::Round($cDrive.Used/1GB, 2)
Write-Host "Current free space: ${cFreeGB}GB" -ForegroundColor Yellow

if (-not $Auto) {
    $confirm = Read-Host "`nProceed with cleanup? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "`nStarting cleanup..." -ForegroundColor Green

# 1. Clean node_modules
Write-Host "`n1. Cleaning node_modules..." -ForegroundColor Cyan
& cmd /c 'for /d %i in (V:\monorepo\apps\*) do @if exist "%i\node_modules" rmdir /s /q "%i\node_modules" 2>nul'
& cmd /c 'for /d %i in (V:\monorepo\packages\*) do @if exist "%i\node_modules" rmdir /s /q "%i\node_modules" 2>nul'

# 2. Clean build artifacts
Write-Host "2. Cleaning build artifacts..." -ForegroundColor Cyan
$buildDirs = @("dist", "build", ".next", ".turbo", "out", "coverage", ".parcel-cache")
foreach ($dir in $buildDirs) {
    Get-ChildItem -Path "V:\monorepo" -Directory -Filter $dir -Recurse -ErrorAction SilentlyContinue |
    ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. Prune Next.js (Turbopack) disk cache
# Next 16 Turbopack has no built-in disk cache pruning — apps/*/.next/cache
# (and the dev-mode apps/*/.next/dev) can accumulate unbounded (a 218MB .sst
# file was found here before). The buildDirs pass above already removes a
# whole ".next" dir when nothing has it locked; this targets just cache/dev
# so it still helps when a running dev server holds other .next files open.
Write-Host "3. Pruning Next.js Turbopack cache..." -ForegroundColor Cyan
$nextCacheDirs = @("cache", "dev")
foreach ($dir in $nextCacheDirs) {
    Get-ChildItem -Path "V:\monorepo\apps\*\.next\$dir" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 4. Clean pnpm store
Write-Host "4. Cleaning pnpm store..." -ForegroundColor Cyan
& pnpm store prune 2>$null

# 5. Clean npm cache
Write-Host "5. Cleaning npm cache..." -ForegroundColor Cyan
& npm cache clean --force 2>$null

# Check new space
Start-Sleep -Seconds 2
$cDriveNew = Get-PSDrive C
$cFreeNewGB = [math]::Round($cDriveNew.Free/1GB, 2)
$freedGB = [math]::Round($cFreeNewGB - $cFreeGB, 2)

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host "Previous free space: ${cFreeGB}GB"
Write-Host "Current free space: ${cFreeNewGB}GB"
Write-Host "Space freed: ${freedGB}GB" -ForegroundColor Green

Write-Host "`nTo reinstall dependencies:" -ForegroundColor Cyan
Write-Host "  cd [project-folder]" -ForegroundColor Gray
Write-Host "  pnpm install" -ForegroundColor Gray