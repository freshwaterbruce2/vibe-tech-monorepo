# Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Ensure environment variables are loaded
if (Test-Path ".\scripts\Initialize-DevProcessEnvironment.ps1") {
    . .\scripts\Initialize-DevProcessEnvironment.ps1
    $EnvConfig = Initialize-DevProcessEnvironment
}

Write-Host "[+] Initializing Agent Swarm Platform..." -ForegroundColor Cyan

# 1. Verify path structures are using forward slashes in env (safeguard for backslash bug)
$env:DATABASE_PATH = "D:/databases/memory.db"
$env:LOG_PATH = "D:/logs"
$env:LEARNING_SYSTEM_PATH = "D:/learning-system"

# 2. Check Database availability
if (-not (Test-Path "D:\databases\memory.db")) {
    Write-Host "[-] Database memory.db not found. Creating a fresh instance..." -ForegroundColor Yellow
    if (Test-Path ".\scripts\Initialize-LearningDatabase.ps1") {
        . .\scripts\Initialize-LearningDatabase.ps1
    } else {
        Write-Warning "Initialize-LearningDatabase.ps1 not found. Skipping DB initialization."
    }
} else {
    Write-Host "[OK] Verified database: D:\databases\memory.db" -ForegroundColor Green
}

# 3. Start IPC WebSocket Bridge (port 5004)
Write-Host "[+] Spawning WebSocket Bridge daemon..." -ForegroundColor Yellow
$BridgeJob = Start-Job -ScriptBlock {
    # Run the compiled project via Nx
    pnpm nx run ipc-bridge:serve
}
Start-Sleep -Seconds 3

# Validate connection state
$PortCheck = Get-NetTCPConnection -LocalPort 5004 -ErrorAction SilentlyContinue
if ($PortCheck) {
    Write-Host "[OK] IPC Bridge running on ws://127.0.0.1:5004" -ForegroundColor Green
} else {
    Write-Warning "IPC Bridge not detected on port 5004. Check logs at D:\logs\ipc-bridge.log"
}

# 4. Initialize Memory Synchronizer Loop
Write-Host "[+] Spawning Background Memory Synchronizer..." -ForegroundColor Yellow
$SyncJob = Start-Job -ScriptBlock {
    if (Test-Path ".\scripts\Start-MemorySync.ps1") {
        . .\scripts\Start-MemorySync.ps1
    } else {
        Write-Warning "Start-MemorySync.ps1 not found. Memory sync background loop skipped."
    }
}
Write-Host "[OK] Background memory sync running." -ForegroundColor Green

# 5. Launch Codex Sandbox Shell
Write-Host "`n[+] Spawning Codex Workspace Sandbox..." -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host " Launching: codex --cd V:/monorepo" -ForegroundColor White
Write-Host " Sandbox active: Writable roots limited to V:/monorepo and D:/databases" -ForegroundColor Gray
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# Use npx.cmd for executing Codex command in Windows environment safely
if (Get-Command "codex" -ErrorAction SilentlyContinue) {
    codex --cd V:/monorepo
} else {
    Write-Warning "codex command is not installed or available in PATH. Please configure your Codex CLI."
}
