$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$BuildDir = Join-Path $ScriptDir "backend\build"
$DistDir = Join-Path $ScriptDir "backend\dist"
$LogFile = Join-Path $ScriptDir "build_v8.log"

if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }

New-Item -ItemType Directory -Path $BuildDir -Force
New-Item -ItemType Directory -Path $DistDir -Force

# Try to find Python in .venv first, otherwise use PATH
# Try to find Python in backend/.venv first, then root .venv
$BackendVenv = Join-Path $ScriptDir "backend\.venv\Scripts\python.exe"
$RootVenv = Join-Path $ScriptDir ".venv\Scripts\python.exe"

if (Test-Path $BackendVenv) {
    $PythonCmd = $BackendVenv
}
elseif (Test-Path $RootVenv) {
    $PythonCmd = $RootVenv
}
else {
    $PythonCmd = "python"
}

$SpecFile = Join-Path $ScriptDir "native.spec"

Write-Host "[INFO] Building Vibe-Justice Backend..." -ForegroundColor Cyan
Write-Host "Python Path: $PythonCmd"
Write-Host "Spec File:   $SpecFile"
Write-Host "Build Dir:   $BuildDir"
Write-Host "Dist Dir:    $DistDir"

# Use python -m PyInstaller to avoid path issues
& $PythonCmd -m PyInstaller --noconfirm --clean `
    --workpath $BuildDir `
    --distpath $DistDir `
    $SpecFile | Tee-Object -FilePath $LogFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build Success: $DistDir\VibeJustice.exe" -ForegroundColor Green
}
else {
    Write-Host "❌ Build Failed. Dumping Log:" -ForegroundColor Red
    Get-Content $LogFile | Select-Object -Last 50
    exit 1
}
