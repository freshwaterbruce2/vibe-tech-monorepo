# Helper script to launch the Native Vibe Justice UI
# Ensures we use the correct virtual environment where PySide6 is installed

$VenvPython = "$PSScriptRoot\.venv\Scripts\python.exe"
$LaunchScript = "$PSScriptRoot\backend\launch_native.py"

if (-not (Test-Path $VenvPython)) {
    Write-Error "Virtual environment not found at $VenvPython"
    exit 1
}

Write-Host "[NATIVE UI] Launching using local venv..." -ForegroundColor Cyan
& $VenvPython $LaunchScript
