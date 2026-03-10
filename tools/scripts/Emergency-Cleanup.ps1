# Emergency Disk Cleanup Script
# CRITICAL: C:\ drive is 99.3% full!

param(
    [switch]$Execute = $false
)

Write-Host "`n!!! EMERGENCY DISK CLEANUP !!!" -ForegroundColor Red
Write-Host "C:\ drive critical: Only 3.13GB free!" -ForegroundColor Red
Write-Host ""

# Quick check of immediate cleanup targets
Write-Host "Quick scan for large cleanup targets..." -ForegroundColor Yellow

# 1. Find largest node_modules in C:\dev
Write-Host "`nChecking node_modules folders (top 5 largest)..." -ForegroundColor Cyan
$largestNodeModules = @()

Get-ChildItem -Path "C:\dev\apps" -Directory | ForEach-Object {
    $nmPath = Join-Path $_.FullName "node_modules"
    if (Test-Path $nmPath) {
        $projectName = $_.Name
        # Quick size estimate (count files * average size)
        $fileCount = (Get-ChildItem -Path $nmPath -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1000).Count
        $estimatedSizeGB = [math]::Round($fileCount * 0.001, 2)  # Rough estimate
        $largestNodeModules += [PSCustomObject]@{
            Project = $projectName
            Path = $nmPath
            EstimatedGB = $estimatedSizeGB
        }
    }
}

$largestNodeModules | Sort-Object EstimatedGB -Descending | Select-Object -First 5 | Format-Table

# 2. Check for build artifacts
Write-Host "`nChecking for build artifacts..." -ForegroundColor Cyan
$buildFolders = @()
$buildPaths = @("dist", "build", ".next", ".turbo", "out")

foreach ($buildPath in $buildPaths) {
    $found = Get-ChildItem -Path "C:\dev" -Directory -Filter $buildPath -Recurse -ErrorAction SilentlyContinue |
             Select-Object -First 10
    foreach ($folder in $found) {
        $buildFolders += $folder.FullName.Replace("C:\dev\", "")
    }
}

if ($buildFolders.Count -gt 0) {
    Write-Host "Found $($buildFolders.Count) build folders:"
    $buildFolders | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
}

# 3. Check package manager caches
Write-Host "`nChecking package manager caches..." -ForegroundColor Cyan
$caches = @(
    @{Path="$env:LOCALAPPDATA\npm-cache"; Name="npm cache"},
    @{Path="$env:LOCALAPPDATA\pnpm"; Name="pnpm cache"},
    @{Path="C:\Users\$env:USERNAME\.pnpm-store"; Name="pnpm store"}
)

foreach ($cache in $caches) {
    if (Test-Path $cache.Path) {
        $files = Get-ChildItem -Path $cache.Path -File -Recurse -ErrorAction SilentlyContinue |
                 Select-Object -First 100
        if ($files.Count -gt 0) {
            Write-Host "  $($cache.Name): Found (contains files)" -ForegroundColor Yellow
        }
    }
}

# Immediate actions
Write-Host "`n=== IMMEDIATE ACTIONS NEEDED ===" -ForegroundColor Red
Write-Host "1. Delete node_modules from projects not currently in use"
Write-Host "2. Clear all build/dist folders"
Write-Host "3. Clear package manager caches"
Write-Host ""

if (-not $Execute) {
    Write-Host "To execute cleanup, run:" -ForegroundColor Yellow
    Write-Host "  .\Emergency-Cleanup.ps1 -Execute" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This will:" -ForegroundColor Gray
    Write-Host "  - Remove ALL node_modules in C:\dev\apps" -ForegroundColor Gray
    Write-Host "  - Remove ALL dist/build folders" -ForegroundColor Gray
    Write-Host "  - Clear npm/pnpm caches" -ForegroundColor Gray
} else {
    Write-Host "EXECUTING EMERGENCY CLEANUP..." -ForegroundColor Red
    $confirm = Read-Host "This will delete ALL node_modules and build folders. Continue? (YES/no)"

    if ($confirm -eq "YES") {
        $freedSpace = 0

        # Delete all node_modules in apps
        Write-Host "`nDeleting node_modules folders..." -ForegroundColor Yellow
        Get-ChildItem -Path "C:\dev\apps" -Directory | ForEach-Object {
            $nmPath = Join-Path $_.FullName "node_modules"
            if (Test-Path $nmPath) {
                Write-Host "  Removing: $($_.Name)/node_modules" -ForegroundColor Gray
                Remove-Item -Path $nmPath -Recurse -Force -ErrorAction SilentlyContinue
            }
        }

        # Delete packages node_modules
        Get-ChildItem -Path "C:\dev\packages" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $nmPath = Join-Path $_.FullName "node_modules"
            if (Test-Path $nmPath) {
                Write-Host "  Removing: packages/$($_.Name)/node_modules" -ForegroundColor Gray
                Remove-Item -Path $nmPath -Recurse -Force -ErrorAction SilentlyContinue
            }
        }

        # Delete build artifacts
        Write-Host "`nDeleting build artifacts..." -ForegroundColor Yellow
        $buildPaths = @("dist", "build", ".next", ".turbo", "out")
        foreach ($buildPath in $buildPaths) {
            Get-ChildItem -Path "C:\dev" -Directory -Filter $buildPath -Recurse -ErrorAction SilentlyContinue |
            ForEach-Object {
                Write-Host "  Removing: $($_.FullName.Replace('C:\dev\', ''))" -ForegroundColor Gray
                Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
        }

        # Clear pnpm cache
        Write-Host "`nClearing pnpm cache..." -ForegroundColor Yellow
        & pnpm store prune 2>$null

        # Clear npm cache
        Write-Host "Clearing npm cache..." -ForegroundColor Yellow
        & npm cache clean --force 2>$null

        # Check new free space
        Start-Sleep -Seconds 2
        $cDriveNew = Get-PSDrive C
        $cFreeNew = [math]::Round($cDriveNew.Free/1GB, 2)

        Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
        Write-Host "New free space: ${cFreeNew}GB" -ForegroundColor Green

        if ($cFreeNew -gt 10) {
            Write-Host "Crisis averted! You now have breathing room." -ForegroundColor Green
        } else {
            Write-Host "Still low on space. Consider moving projects to D:\" -ForegroundColor Yellow
        }

        Write-Host "`nTo reinstall dependencies for a project:" -ForegroundColor Cyan
        Write-Host "  cd C:\dev\apps\[project-name]" -ForegroundColor Gray
        Write-Host "  pnpm install" -ForegroundColor Gray
    } else {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    }
}