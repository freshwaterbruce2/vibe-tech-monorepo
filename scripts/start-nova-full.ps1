# Nova Agent Full Stack Startup Script
# Starts both the OpenRouter Proxy and Nova Agent

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 NOVA Agent Full Stack Launcher" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if OpenRouter Proxy is already running
Write-Host "🔍 Checking OpenRouter Proxy..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ OpenRouter Proxy is already running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "⚠️  OpenRouter Proxy not running, starting it..." -ForegroundColor Yellow
    
    # Start OpenRouter Proxy in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\dev\backend\openrouter-proxy; Write-Host '🔌 Starting OpenRouter Proxy...' -ForegroundColor Cyan; pnpm dev"
    
    Write-Host "⏳ Waiting for proxy to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Verify it started
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ OpenRouter Proxy started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start OpenRouter Proxy" -ForegroundColor Red
        Write-Host "   Please check backend/openrouter-proxy/.env file" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🎯 Starting Nova Agent..." -ForegroundColor Cyan
Write-Host ""

# Navigate to Nova Agent directory
cd C:\dev\apps\nova-agent

# Check .env configuration
if (Test-Path "src-tauri\.env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, creating from example..." -ForegroundColor Yellow
    if (Test-Path "src-tauri\.env.example") {
        Copy-Item "src-tauri\.env.example" "src-tauri\.env"
        Write-Host "✅ Created .env file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🚀 Launching Nova Agent (Tauri)..." -ForegroundColor Cyan
Write-Host ""

# Start Nova Agent
pnpm tauri dev

