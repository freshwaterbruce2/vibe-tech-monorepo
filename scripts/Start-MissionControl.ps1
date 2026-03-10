Write-Host "🚀 Vibe-Tech Mission Control Initiated..." -ForegroundColor Cyan

# 1. Validate Environment
if (-not (Test-Path "C:\dev\CodingGuidelines.json")) {
    Write-Error "❌ CRITICAL: Constitutional document 'CodingGuidelines.json' missing."
    exit 1
}
Write-Host "✅ Constitution Verified." -ForegroundColor Green

# 2. Check Dependencies (Fast Check)
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "❌ pnpm is not installed or not in PATH."
    exit 1
}

# 3. Start IPC Bridge (The Nervous System)
Write-Host "🔌 Starting IPC Bridge..." -ForegroundColor Yellow
$bridgeProcess = Start-Process -FilePath "npx" -ArgumentList "tsx C:\dev\backend\ipc-bridge\src\server.ts" -PassThru -NoNewWindow
Write-Host "   Bridge PID: $($bridgeProcess.Id)"

# Wait for bridge to warm up
Start-Sleep -Seconds 3

# 4. Start Nova Agent (The Brain + Hands + Tray)
Write-Host "🧠 Starting Nova Agent Hardware Controller..." -ForegroundColor Magenta
# Dynamically get the tray app instance to manage autonomous mode
$novaTrayApp = python C:\dev\apps\nova-agent\src\ui\tray_icon.py
$novaProcess = Start-Process -FilePath python -ArgumentList "C:\dev\apps\nova-agent\src\ui\tray_icon.py" -PassThru -NoNewWindow
Write-Host "   Nova PID: $($novaProcess.Id)"

# 5. Launch Vibe Code Studio (The Cockpit)
Write-Host "💻 Powering up Vibe Code Studio (Electron/Vite)..." -ForegroundColor Green
# Using the exact command from the user's prompt
$vibeProcess = Start-Process -FilePath "pnpm" -ArgumentList "--filter vibe-code-studio run electron:dev" -WorkingDirectory "C:\dev" -PassThru -NoNewWindow
Write-Host "   Vibe PID: $($vibeProcess.Id)"

Write-Host "`n✅ Mission Control is LIVE." -ForegroundColor Cyan
Write-Host "   - Tray Icon: Check your system tray for the Blue Circle"
Write-Host "   - Cockpit: Vibe Code Studio is initializing"
Write-Host "   - Safety: Toggle 'Autonomous Mode' in the tray to enable/disable hardware control"
Write-Host "   - DNA: Referencing 'CodingGuidelines.json' for all operations"
