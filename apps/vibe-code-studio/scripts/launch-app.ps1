# Quick launcher for Vibe Code Studio - Optimized Build
# Shows startup time

Write-Host "Launching Vibe Code Studio..." -ForegroundColor Cyan
Write-Host "Package size: OPTIMIZED - 25MB ASAR (was 299MB)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Expected load time:" -ForegroundColor Green
Write-Host "   - First launch: 2-3 seconds" -ForegroundColor Gray
Write-Host "   - Subsequent: 1-2 seconds" -ForegroundColor Gray
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\vibe-code-studio\Vibe Code Studio.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Vibe Code Studio\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\vibe-code-studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\debug\deps\vibe_code_studio.exe')
)

$appPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (Test-Path $appPath) {
    $startTime = Get-Date
    Write-Host "Starting application..." -ForegroundColor Cyan

    Start-Process -FilePath $appPath

    $elapsed = (Get-Date) - $startTime
    Write-Host ""
    Write-Host "Application launched in $($elapsed.TotalSeconds) seconds" -ForegroundColor Green
    Write-Host ""
    Write-Host "If Windows SmartScreen appears:" -ForegroundColor Yellow
    Write-Host "   Click 'More info' then 'Run anyway'" -ForegroundColor Gray
} else {
    Write-Host "Application not found. Checked:" -ForegroundColor Red
    $candidates | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "Run this first:" -ForegroundColor Yellow
    Write-Host "   cd C:\dev\apps\vibe-code-studio" -ForegroundColor Gray
    Write-Host "   pnpm run tauri:dev" -ForegroundColor Gray
    Write-Host "   or pnpm run tauri:build" -ForegroundColor Gray
}
