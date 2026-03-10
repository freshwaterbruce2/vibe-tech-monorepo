$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Warning "Virtual environment python not found at $VenvPython. Using system 'python'."
    $VenvPython = "python"
}

Write-Host "Starting Vibe-Justice Nuitka Build..." -ForegroundColor Cyan
Write-Host "Entry Point: backend/launcher.py"
Write-Host "Mode: Standalone + Onefile"

# Execute Nuitka
# Note: Using backend/launcher.py as the verified entry point for the Process Detachment architecture
& $VenvPython -m nuitka --standalone --onefile --enable-plugin=pyside6 --windows-icon-from-ico=assets/icon.ico --output-dir=dist_nuitka --output-filename=VibeJustice.exe backend/launcher.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Nuitka Build Success!" -ForegroundColor Green
    Write-Host "Output: $ScriptDir\dist_nuitka\VibeJustice.exe"
} else {
    Write-Host "❌ Nuitka Build Failed." -ForegroundColor Red
    exit 1
}
