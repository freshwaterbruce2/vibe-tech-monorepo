# Test launch the packaged app and capture console output
$projectRoot = Split-Path -Parent $PSScriptRoot
$candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\vibe-code-studio\Vibe Code Studio.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Vibe Code Studio\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\vibe-code-studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\debug\deps\vibe_code_studio.exe')
)

$appPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $appPath) {
    $checkedPaths = $candidates -join "`n"
    Write-Error "Vibe Code Studio executable not found. Checked:`n$checkedPaths"
    exit 1
}

Write-Host "Launching Vibe Code Studio..." -ForegroundColor Cyan
Write-Host "If app is stuck on loading screen, check for errors in DevTools (F12)" -ForegroundColor Yellow
Write-Host ""

& $appPath
