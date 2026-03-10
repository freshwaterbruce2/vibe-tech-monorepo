<#
.SYNOPSIS
    Launches the full Vibe Ecosystem: IPC Bridge, Nova Agent, and Vibe Code Studio.
    
.DESCRIPTION
    This script orchestrates the startup of the "Cursor-killing" environment.
    1. Starts the IPC Bridge Server (Port 5004)
    2. Starts Nova Agent (Tauri)
    3. Starts Vibe Code Studio (Electron)
    
    It ensures that the Bridge is ready before launching the clients to prevent connection errors.

.EXAMPLE
    .\scripts\launch-vibe-ecosystem.ps1
#>

Write-Host "🚀 Initializing Vibe Ecosystem..." -ForegroundColor Cyan

# 1. Start IPC Bridge
Write-Host "Step 1: Starting IPC Bridge Server (Port 5004)..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd", "backend/ipc-bridge", "&&", "pnpm", "run", "dev" -PassThru -NoNewWindow
if ($bridgeProcess.Id) {
    Write-Host "   ✅ Bridge Server started (PID: $($bridgeProcess.Id))" -ForegroundColor Green
} else {
    Write-Error "   ❌ Failed to start Bridge Server"
    exit 1
}

# Wait for bridge to warm up
Start-Sleep -Seconds 5

# 2. Start Nova Agent
Write-Host "Step 2: Launching Nova Agent (The Brain)..." -ForegroundColor Yellow
# Using Start-Process to run in a new window so it doesn't block this script
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd apps/nova-agent; pnpm tauri dev"
Write-Host "   ✅ Nova Agent launch command issued" -ForegroundColor Green

# 3. Start Vibe Code Studio
Write-Host "Step 3: Launching Vibe Code Studio (The Body)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd apps/vibe-code-studio; pnpm run dev"
Write-Host "   ✅ Vibe Code Studio launch command issued" -ForegroundColor Green

Write-Host "`n✨ Vibe Ecosystem is running!" -ForegroundColor Cyan
Write-Host "   - IPC Bridge: Listening on 5004"
Write-Host "   - Nova Agent: Connecting..."
Write-Host "   - Vibe Studio: Connecting..."
Write-Host "`nPress any key to exit this launcher (processes will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
