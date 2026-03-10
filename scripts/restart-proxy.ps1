# Restart OpenRouter Proxy Server
Write-Host "🔄 Restarting OpenRouter Proxy..." -ForegroundColor Yellow
Write-Host ""

# Kill any existing process on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($process) {
    Write-Host "⏹️  Stopping existing proxy (PID: $process)..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "🔌 Starting OpenRouter Proxy Server..." -ForegroundColor Cyan
Write-Host ""

cd C:\dev\backend\openrouter-proxy
pnpm dev

