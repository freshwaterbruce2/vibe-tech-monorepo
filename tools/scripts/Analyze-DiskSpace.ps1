# Disk Space Analysis and Cleanup Script
# Focuses on development files that can be safely cleaned

param(
    [switch]$DryRun = $true,  # Safety first - preview by default
    [switch]$AnalyzeOnly = $false
)

Write-Host "`n=== DISK SPACE ANALYZER ===" -ForegroundColor Magenta
Write-Host "Current C:\ drive usage analysis" -ForegroundColor Cyan
Write-Host ""

# Get current disk usage
$cDrive = Get-PSDrive C
$cUsed = [math]::Round($cDrive.Used/1GB, 2)
$cFree = [math]::Round($cDrive.Free/1GB, 2)
$cTotal = [math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2)
$cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)

Write-Host "Current Status:" -ForegroundColor Yellow
Write-Host "  Used: ${cUsed}GB / ${cTotal}GB (${cPercent}%)" -ForegroundColor Red
Write-Host "  Free: ${cFree}GB" -ForegroundColor Red
Write-Host ""

# Analyze node_modules folders
Write-Host "Analyzing node_modules folders..." -ForegroundColor Yellow
$nodeModules = Get-ChildItem -Path "C:\dev" -Directory -Recurse -Filter "node_modules" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\.*\\node_modules" }  # Skip nested node_modules

$nodeModulesSize = 0
$nodeModulesList = @()

foreach ($nm in $nodeModules) {
    try {
        $size = (Get-ChildItem -Path $nm.FullName -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum / 1GB
        if ($size -gt 0) {
            $nodeModulesSize += $size
            $nodeModulesList += [PSCustomObject]@{
                Path = $nm.FullName.Replace("C:\dev\", "")
                SizeGB = [math]::Round($size, 2)
            }
        }
    } catch {
        # Skip if we can't access
    }
}

Write-Host "Found $($nodeModulesList.Count) node_modules folders"
Write-Host "Total size: $([math]::Round($nodeModulesSize, 2))GB" -ForegroundColor Cyan

# Show top 10 largest
if ($nodeModulesList.Count -gt 0) {
    Write-Host "`nTop 10 largest node_modules:" -ForegroundColor Yellow
    $nodeModulesList | Sort-Object SizeGB -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host ("  " + $_.Path + ": " + $_.SizeGB + "GB") -ForegroundColor Gray
    }
}

# Analyze dist/build folders
Write-Host "`nAnalyzing build/dist folders..." -ForegroundColor Yellow
$buildFolders = Get-ChildItem -Path "C:\dev" -Directory -Recurse -Include "dist", "build", ".next", ".turbo", "out", "target" -ErrorAction SilentlyContinue

$buildSize = 0
$buildList = @()

foreach ($bf in $buildFolders) {
    try {
        $size = (Get-ChildItem -Path $bf.FullName -Recurse -File -ErrorAction SilentlyContinue |
                 Measure-Object -Property Length -Sum).Sum / 1GB
        if ($size -gt 0.1) {  # Only count if > 100MB
            $buildSize += $size
            $buildList += [PSCustomObject]@{
                Path = $bf.FullName.Replace("C:\dev\", "")
                SizeGB = [math]::Round($size, 2)
            }
        }
    } catch {
        # Skip if we can't access
    }
}

Write-Host "Found $($buildList.Count) build folders"
Write-Host "Total size: $([math]::Round($buildSize, 2))GB" -ForegroundColor Cyan

# Analyze other large folders
Write-Host "`nAnalyzing other large folders..." -ForegroundColor Yellow
$largeFolders = @()

# Check common large directories
$checkPaths = @(
    "C:\Users\$env:USERNAME\AppData\Local\npm-cache",
    "C:\Users\$env:USERNAME\AppData\Local\pnpm",
    "C:\Users\$env:USERNAME\.npm",
    "C:\Users\$env:USERNAME\.pnpm-store",
    "C:\dev\.pnpm-store",
    "C:\ProgramData\npm-cache"
)

foreach ($path in $checkPaths) {
    if (Test-Path $path) {
        try {
            $size = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue |
                     Measure-Object -Property Length -Sum).Sum / 1GB
            if ($size -gt 0.5) {
                $largeFolders += [PSCustomObject]@{
                    Path = $path
                    SizeGB = [math]::Round($size, 2)
                    Type = "Cache"
                }
            }
        } catch {
            # Skip if we can't access
        }
    }
}

if ($largeFolders.Count -gt 0) {
    Write-Host "`nLarge cache folders found:" -ForegroundColor Yellow
    $largeFolders | ForEach-Object {
        Write-Host ("  " + $_.Path + ": " + $_.SizeGB + "GB") -ForegroundColor Gray
    }
}

# Calculate potential savings
$potentialSavings = $nodeModulesSize + $buildSize
Write-Host "`n=== POTENTIAL SAVINGS ===" -ForegroundColor Green
Write-Host "Node modules: $([math]::Round($nodeModulesSize, 2))GB"
Write-Host "Build folders: $([math]::Round($buildSize, 2))GB"
Write-Host "Total potential savings: $([math]::Round($potentialSavings, 2))GB" -ForegroundColor Green

if (-not $AnalyzeOnly) {
    Write-Host "`n=== CLEANUP OPTIONS ===" -ForegroundColor Yellow

    if ($DryRun) {
        Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Cyan
        Write-Host "To execute cleanup, run: .\Analyze-DiskSpace.ps1 -DryRun:`$false" -ForegroundColor Gray
    }

    Write-Host "`nRecommended cleanup actions:" -ForegroundColor Yellow
    Write-Host "1. Clean all node_modules (reinstall as needed)"
    Write-Host "2. Clean all build/dist folders"
    Write-Host "3. Clear npm/pnpm caches"
    Write-Host "4. Move large projects to D:\"

    if (-not $DryRun) {
        $confirm = Read-Host "`nProceed with cleanup? (yes/no)"
        if ($confirm -eq "yes") {
            Write-Host "`nStarting cleanup..." -ForegroundColor Green

            # Clean node_modules
            Write-Host "Removing node_modules folders..." -ForegroundColor Yellow
            $cleaned = 0
            foreach ($nm in $nodeModulesList | Sort-Object SizeGB -Descending) {
                try {
                    Remove-Item -Path (Join-Path "C:\dev" $nm.Path) -Recurse -Force -ErrorAction Stop
                    Write-Host "  Removed: $($nm.Path)" -ForegroundColor Green
                    $cleaned += $nm.SizeGB
                } catch {
                    Write-Host "  Failed to remove: $($nm.Path)" -ForegroundColor Red
                }
            }
            Write-Host "Freed up: $([math]::Round($cleaned, 2))GB from node_modules" -ForegroundColor Green

            # Clean build folders
            Write-Host "`nRemoving build folders..." -ForegroundColor Yellow
            $cleanedBuild = 0
            foreach ($bf in $buildList | Sort-Object SizeGB -Descending) {
                try {
                    Remove-Item -Path (Join-Path "C:\dev" $bf.Path) -Recurse -Force -ErrorAction Stop
                    Write-Host "  Removed: $($bf.Path)" -ForegroundColor Green
                    $cleanedBuild += $bf.SizeGB
                } catch {
                    Write-Host "  Failed to remove: $($bf.Path)" -ForegroundColor Red
                }
            }
            Write-Host "Freed up: $([math]::Round($cleanedBuild, 2))GB from build folders" -ForegroundColor Green

            Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
            Write-Host "Total space freed: $([math]::Round($cleaned + $cleanedBuild, 2))GB" -ForegroundColor Green

            # Check new status
            $cDriveNew = Get-PSDrive C
            $cFreeNew = [math]::Round($cDriveNew.Free/1GB, 2)
            Write-Host "New free space: ${cFreeNew}GB" -ForegroundColor Cyan
        } else {
            Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host "1. Run 'pnpm install' in projects as you work on them"
Write-Host "2. Consider moving rarely-used projects to D:\"
Write-Host "3. Set up a weekly cleanup schedule"
Write-Host "4. Use 'pnpm store prune' regularly to clean pnpm cache"
Write-Host ""