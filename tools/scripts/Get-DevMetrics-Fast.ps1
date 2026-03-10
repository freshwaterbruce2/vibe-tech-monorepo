# Fast Development Metrics Script

Write-Host ""
Write-Host "Development Metrics (Quick View)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Quick project count
Write-Host ""
Write-Host "Projects:" -ForegroundColor Yellow
$apps = (Get-ChildItem -Path "C:\dev\apps" -Directory -ErrorAction SilentlyContinue).Count
$packages = (Get-ChildItem -Path "C:\dev\packages" -Directory -ErrorAction SilentlyContinue).Count
$backend = (Get-ChildItem -Path "C:\dev\backend" -Directory -ErrorAction SilentlyContinue).Count
$tools = (Get-ChildItem -Path "C:\dev\tools" -Directory -ErrorAction SilentlyContinue).Count

Write-Host "  apps: $apps" -ForegroundColor Cyan
Write-Host "  packages: $packages" -ForegroundColor Cyan
Write-Host "  backend: $backend" -ForegroundColor Cyan
Write-Host "  tools: $tools" -ForegroundColor Cyan
$total = $apps + $packages + $backend + $tools
Write-Host "  Total: $total projects" -ForegroundColor Green

# Disk usage
Write-Host ""
Write-Host "Disk Usage:" -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$dDrive = Get-PSDrive D -ErrorAction SilentlyContinue

$cUsed = [math]::Round($cDrive.Used/1GB, 2)
$cTotal = [math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2)
$cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)
$cColor = if ($cPercent -gt 90) { "Red" } else { "Yellow" }
Write-Host ("  C: " + $cUsed + "GB / " + $cTotal + "GB") -ForegroundColor $cColor

if ($dDrive) {
    $dUsed = [math]::Round($dDrive.Used/1GB, 2)
    $dTotal = [math]::Round(($dDrive.Used + $dDrive.Free)/1GB, 2)
    $dPercent = [math]::Round($dDrive.Used / ($dDrive.Used + $dDrive.Free) * 100, 1)
    $dColor = if ($dPercent -gt 75) { "Red" } else { "Green" }
    Write-Host ("  D: " + $dUsed + "GB / " + $dTotal + "GB") -ForegroundColor $dColor
}

Write-Host ""
Write-Host "Complete!" -ForegroundColor Green
Write-Host ""

# Add as an alias
Write-Host "Tip: Add this alias to your PowerShell profile:" -ForegroundColor Gray
Write-Host '  Set-Alias metrics "C:\dev\tools\scripts\Get-DevMetrics-Fast.ps1"' -ForegroundColor Gray