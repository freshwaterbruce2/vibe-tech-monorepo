# monorepo-cleanup.ps1
# Comprehensive monorepo cleanup for C:\dev
# Frees disk space by removing build artifacts, caches, and duplicates
# Safety: DryRun mode enabled by default
# Author: Claude Architect
# Date: 2026-01-25

param(
    [switch]$DryRun = $true,
    [switch]$Deep = $false,  # Also cleans app-level node_modules (risky)
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"
$Root = "C:\dev"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TotalFreed = 0

function Get-DirSize($path) {
    if (Test-Path $path) {
        $size = (Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue | 
                 Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        return [math]::Round($size / 1MB, 2)
    }
    return 0
}

function Remove-SafeDir($path, $description) {
    if (Test-Path $path) {
        $sizeMB = Get-DirSize $path
        $script:TotalFreed += $sizeMB
        
        if ($DryRun) {
            Write-Host "  [DRY] Would remove: $description ($sizeMB MB)" -ForegroundColor Yellow
        } else {
            Write-Host "  Removing: $description ($sizeMB MB)" -ForegroundColor Red
            Remove-Item -Path $path -Recurse -Force -ErrorAction Continue
        }
    }
}

Write-Host "=== Monorepo Cleanup ===" -ForegroundColor Cyan
Write-Host "Mode: $(if($DryRun){'DRY RUN (use -DryRun:$false to execute)'}else{'LIVE - DELETING FILES'})" -ForegroundColor $(if($DryRun){'Yellow'}else{'Red'})
Write-Host ""

# 1. Root-level caches and artifacts
Write-Host "1. Root-level cleanup" -ForegroundColor Cyan
Remove-SafeDir "$Root\.nx\cache" "Nx cache"
Remove-SafeDir "$Root\playwright-report" "Playwright reports"
Remove-SafeDir "$Root\test-results" "Test results"
Remove-SafeDir "$Root\tmp" "Temp directory"

# 2. VCS duplicates (the big one)
Write-Host "`n2. VCS duplicate directories" -ForegroundColor Cyan
Remove-SafeDir "$Root\apps\vibe-code-studio\.deploy-test" "VCS .deploy-test (DUPLICATE)"
Remove-SafeDir "$Root\apps\vibe-code-studio\coverage" "VCS coverage"
Remove-SafeDir "$Root\apps\vibe-code-studio\test-results" "VCS test-results"
Remove-SafeDir "$Root\apps\vibe-code-studio\test_screenshots" "VCS test screenshots"
Remove-SafeDir "$Root\apps\vibe-code-studio\dist" "VCS dist (rebuild with pnpm nx build)"
Remove-SafeDir "$Root\apps\vibe-code-studio\dist-electron" "VCS dist-electron"
Remove-SafeDir "$Root\apps\vibe-code-studio\out" "VCS out (electron build)"

# 3. Build artifacts across apps
Write-Host "`n3. Build artifacts across apps" -ForegroundColor Cyan
$buildDirs = @("dist", "build", "out", ".next", "coverage", "playwright-report", "test-results")
Get-ChildItem -Path "$Root\apps" -Directory | ForEach-Object {
    $appPath = $_.FullName
    $appName = $_.Name
    
    foreach ($dir in $buildDirs) {
        $targetPath = Join-Path $appPath $dir
        if ((Test-Path $targetPath) -and $appName -ne "vibe-code-studio") {
            Remove-SafeDir $targetPath "$appName\$dir"
        }
    }
}

# 4. Stale files
Write-Host "`n4. Stale debug/log files" -ForegroundColor Cyan
$stalePatterns = @("*.log", "*.tsbuildinfo", "nul", "compile_errors.txt", "typecheck_*.txt", "test_output*.txt", "eslint-report.json")
foreach ($pattern in $stalePatterns) {
    Get-ChildItem -Path $Root -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue | 
    Where-Object { $_.DirectoryName -notmatch "node_modules" } |
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $script:TotalFreed += $sizeMB
        if ($DryRun) {
            Write-Host "  [DRY] Would remove: $($_.FullName) ($sizeMB MB)" -ForegroundColor Yellow
        } else {
            Write-Host "  Removing: $($_.Name) ($sizeMB MB)" -ForegroundColor DarkYellow
            Remove-Item $_.FullName -Force
        }
    }
}

# 5. Deep clean (optional - removes app-level node_modules)
if ($Deep) {
    Write-Host "`n5. DEEP CLEAN - App-level node_modules" -ForegroundColor Magenta
    Write-Host "   WARNING: This removes app-specific node_modules. Run 'pnpm install' after." -ForegroundColor Red
    
    $isolatedApps = @("augment-code", "desktop-commander-v3", "shared-web", "digital-content-builder", "monorepo-dashboard", "vibe-agent", "shipping-pwa")
    foreach ($app in $isolatedApps) {
        Remove-SafeDir "$Root\apps\$app\node_modules" "$app\node_modules (isolated)"
    }
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total space $(if($DryRun){'to be freed'}else{'freed'}): $([math]::Round($TotalFreed / 1024, 2)) GB" -ForegroundColor Green

if ($DryRun) {
    Write-Host "`nTo execute cleanup, run:" -ForegroundColor Yellow
    Write-Host "  .\monorepo-cleanup.ps1 -DryRun:`$false" -ForegroundColor White
    Write-Host "  .\monorepo-cleanup.ps1 -DryRun:`$false -Deep  # Include app node_modules" -ForegroundColor White
}

Write-Host "`nPost-cleanup commands:" -ForegroundColor Cyan
Write-Host "  pnpm nx reset          # Reset Nx daemon" -ForegroundColor White
Write-Host "  pnpm store prune       # Prune pnpm store (on D:)" -ForegroundColor White
Write-Host "  pnpm install           # Reinstall if -Deep was used" -ForegroundColor White
