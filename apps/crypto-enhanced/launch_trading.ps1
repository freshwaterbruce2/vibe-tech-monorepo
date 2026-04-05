#!/usr/bin/env pwsh
# Nuclear Trading Bot Launcher - ZERO TOLERANCE for duplicate instances
# Version: 1.0.0

param([switch]$Force, [switch]$NoConfirm, [int]$Timeout = 30)
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "NUCLEAR TRADING BOT LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill ALL existing trading processes
Write-Host "[STEP 1] Killing existing processes..." -ForegroundColor Yellow
$tradingProcesses = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        $cmdline -and ($cmdline -match "crypto-enhanced" -or $cmdline -match "start_live_trading")
    } catch {
        $false
    }
}

foreach ($process in $tradingProcesses) {
    try {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
        Write-Host "[KILLED] PID $($process.Id)" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Failed to stop PID $($process.Id): $_" -ForegroundColor Yellow
    }
}

if (-not $tradingProcesses) {
    Write-Host "[OK] No app-specific Python processes were running" -ForegroundColor Green
}

# Remove ALL lock files
Write-Host "[STEP 2] Removing lock files..." -ForegroundColor Yellow
Remove-Item -Path "*.lock*","nonce_state*.json","$env:TEMP\*trading*.lock*" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Lock files cleaned" -ForegroundColor Green

# Wait for cleanup
Write-Host "[WAIT] Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Launch trading bot
Write-Host "[LAUNCH] Starting trading bot..." -ForegroundColor Green
if (-not (Test-Path $pythonExe)) {
    throw "Python virtual environment not found at $pythonExe. Run 'pnpm run crypto:install' first."
}

if ($NoConfirm -or $Force) {
    & $pythonExe (Join-Path $projectRoot "start_live_trading.py") --auto-confirm
} else {
    & $pythonExe (Join-Path $projectRoot "start_live_trading.py")
}
