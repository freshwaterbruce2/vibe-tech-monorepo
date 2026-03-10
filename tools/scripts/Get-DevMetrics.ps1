# Standalone version of Get-DevMetrics
# Development Metrics Script

Write-Host ""
Write-Host "Development Metrics" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Quick project count
Write-Host ""
Write-Host "Projects in monorepo:" -ForegroundColor Yellow
$projectDirs = @("apps", "packages", "backend", "tools")
$totalProjects = 0

foreach ($dir in $projectDirs) {
    $path = Join-Path "C:\dev" $dir
    if (Test-Path $path) {
        $count = (Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue).Count
        if ($count -gt 0) {
            Write-Host "  $dir - $count projects" -ForegroundColor Cyan
            $totalProjects += $count
        }
    }
}
Write-Host "  Total: $totalProjects projects"

# Quick file stats (limited to apps folder for speed)
Write-Host ""
Write-Host "File counts (apps folder only):" -ForegroundColor Yellow
$appsPath = "C:\dev\apps"

if (Test-Path $appsPath) {
    # Count TypeScript files
    $tsFiles = Get-ChildItem -Path $appsPath -Include "*.ts","*.tsx" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules" }
    $tsCount = $tsFiles.Count

    # Count JavaScript files
    $jsFiles = Get-ChildItem -Path $appsPath -Include "*.js","*.jsx" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules" }
    $jsCount = $jsFiles.Count

    Write-Host "  TypeScript: $tsCount files" -ForegroundColor Cyan
    Write-Host "  JavaScript: $jsCount files" -ForegroundColor Cyan
}

# Check disk usage
Write-Host ""
Write-Host "Disk Usage:" -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$dDrive = Get-PSDrive D -ErrorAction SilentlyContinue

$cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)
$cColor = if ($cPercent -gt 90) { "Red" } elseif ($cPercent -gt 75) { "Yellow" } else { "Green" }
$cUsed = [math]::Round($cDrive.Used/1GB, 2)
$cTotal = [math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2)
Write-Host "  C Drive: ${cUsed}GB / ${cTotal}GB ($cPercent percent)" -ForegroundColor $cColor

if ($dDrive) {
    $dPercent = [math]::Round($dDrive.Used / ($dDrive.Used + $dDrive.Free) * 100, 1)
    $dColor = if ($dPercent -gt 90) { "Red" } elseif ($dPercent -gt 75) { "Yellow" } else { "Green" }
    $dUsed = [math]::Round($dDrive.Used/1GB, 2)
    $dTotal = [math]::Round(($dDrive.Used + $dDrive.Free)/1GB, 2)
    Write-Host "  D Drive: ${dUsed}GB / ${dTotal}GB ($dPercent percent)" -ForegroundColor $dColor
}

Write-Host ""
Write-Host "Metrics complete!" -ForegroundColor Green
Write-Host ""