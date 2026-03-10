$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Release Build (Tauri Edition)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Backend Sidecar
Write-Host "`n[STEP 1] Building Python Backend Sidecar..." -ForegroundColor Yellow
$BackendBuildScript = Join-Path $ScriptDir "frontend\build-backend.ps1"
& $BackendBuildScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend build failed!"
    exit 1
}

# 2. Build Tauri App
Write-Host "`n[STEP 2] Building Tauri Application..." -ForegroundColor Yellow
Set-Location "$ScriptDir\frontend"
pnpm install
pnpm tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri build failed!"
    exit 1
}

# 3. Verify Output
$InstallerDir = Join-Path $ScriptDir "frontend\src-tauri\target\release\bundle\nsis"
if (Test-Path $InstallerDir) {
    $Installer = Get-ChildItem $InstallerDir -Filter "*.exe" | Select-Object -First 1
    if ($Installer) {
        Write-Host "`n✅ SUCCESS! Installer created:" -ForegroundColor Green
        Write-Host $Installer.FullName -ForegroundColor Cyan
        Write-Host "Size: $([math]::Round($Installer.Length / 1MB, 2)) MB" -ForegroundColor Gray
    } else {
        Write-Warning "Build completed but no installer found in $InstallerDir"
    }
} else {
    Write-Warning "Build completed but installer directory not found: $InstallerDir"
}

Write-Host "`nDone." -ForegroundColor Green
