# Vibe-Justice Build Preparation Script
# Enforces a clean state for PyInstaller builds.

# 1. Admin Check
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "`n[!] ERROR: This script requires Administrator privileges to manage processes and file systems." -ForegroundColor Red
    Write-Host "Please right-click and 'Run as Administrator'."
    exit 1
}
Write-Host "[VIBE CHECK] Admin Privileges: [OK]" -ForegroundColor Green

# 2. Process Management
Write-Host "`nScanning for stale processes..." -ForegroundColor Cyan

# Kill VibeJustice.exe
$vibeProcs = Get-Process "VibeJustice" -ErrorAction SilentlyContinue
if ($vibeProcs) {
    $vibeProcs | Stop-Process -Force
    Write-Host " - Terminated VibeJustice.exe instances" -ForegroundColor Yellow
}

# Kill Python processes running from the specific .venv
# Using WMI/CIM to check command line arguments for the virtual environment path
$venvPath = "vibe-justice\.venv"
$pythonProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -like "*$venvPath*" }
foreach ($proc in $pythonProcs) {
    try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host " - Terminated stale Python process (PID: $($proc.ProcessId))" -ForegroundColor Yellow
    } catch {
        Write-Host " - Failed to kill PID $($proc.ProcessId): $_" -ForegroundColor Red
    }
}
Write-Host "[VIBE CHECK] Process Cleanup: [OK]" -ForegroundColor Green

# 3. Directory Cleanup
$dirsToClean = @(
    "D:\_build\v8\native",
    "D:\_build\dist_v8"
)

foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Write-Host "Cleaning $dir..." -ForegroundColor Cyan
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
        } catch {
            Write-Host " - Failed to delete $dir. Retrying after 2 second cooldown..." -ForegroundColor Red
            Start-Sleep -Seconds 2
            try {
                Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
            } catch {
                Write-Host "![CRITICAL] Could not remove $dir. Ensure no other tools (VS Code, Explorer) are locking it." -ForegroundColor Red
                exit 1
            }
        }
    }
}
Write-Host "[VIBE CHECK] Directory Cleanup: [OK]" -ForegroundColor Green

Write-Host "`nReady for Build." -ForegroundColor Green
Write-Host "Run: .\build_v8_final.ps1" -ForegroundColor White
