$ErrorActionPreference = "Stop"

# Generate a timestamp tag: YYYYMMDD_HHMM
$TAG = Get-Date -Format "yyyyMMdd_HHmm"
$DIST_PATH = "d:\_build\dist_$TAG"
$WORK_PATH = "d:\_build\work_$TAG"

Write-Host "Starting PyInstaller build..."
Write-Host "Output Directory: $DIST_PATH"

# Build into a unique directory to avoid rmtree collisions
# We use 'python -m PyInstaller' to ensure we use the venv's pyinstaller
$LOG_FILE = "$PSScriptRoot\build_log.txt"
Write-Host "Logging to $LOG_FILE"

try {
    & "$PSScriptRoot\..\backend\.venv\Scripts\python.exe" -m PyInstaller native.spec --noconfirm --clean `
      --distpath "$DIST_PATH" `
      --workpath "$WORK_PATH" 2>&1 | Tee-Object -FilePath $LOG_FILE
} catch {
    Write-Host "Error executing build: $_" -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful!" -ForegroundColor Green
    Write-Host "Executable located at: $DIST_PATH\VibeJustice.exe"

    # Optional: Verify it exists
    if (Test-Path "$DIST_PATH\VibeJustice.exe") {
        Write-Host "Verification: VibeJustice.exe found." -ForegroundColor Green
    } else {
        Write-Host "Verification Failed: VibeJustice.exe NOT found." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Build Failed with Exit Code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
