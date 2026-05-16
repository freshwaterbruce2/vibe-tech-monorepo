# Nova Agent Launcher
# Quick launcher for Nova Agent with API key verification

Write-Host "🚀 Launching Nova Agent..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "src-tauri")) {
    Write-Host "❌ Error: Must run from apps/nova-agent directory" -ForegroundColor Red
    exit 1
}

# Check for .env file
if (-not (Test-Path "src-tauri/.env")) {
    Write-Host "⚠️  Warning: src-tauri/.env not found" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..." -ForegroundColor Gray
    
    if (Test-Path "src-tauri/.env.example") {
        Copy-Item "src-tauri/.env.example" "src-tauri/.env"
        Write-Host "✅ Created .env file - please edit it with your API keys" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ .env.example not found either!" -ForegroundColor Red
        exit 1
    }
}

# Verify API keys are set
Write-Host "🔍 Checking API keys..." -ForegroundColor Yellow
$envContent = Get-Content "src-tauri/.env" -Raw

if ($envContent -match 'OPENROUTER_API_KEY=sk-or-v1-\w+') {
    Write-Host "✅ OpenRouter API key found" -ForegroundColor Green
} else {
    Write-Host "⚠️  OpenRouter API key not set in .env" -ForegroundColor Yellow
}

if ($envContent -match 'GROQ_API_KEY=gsk_\w+') {
    Write-Host "✅ Groq API key found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Groq API key not set in .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🎯 Starting Nova Agent..." -ForegroundColor Cyan
Write-Host ""

# Launch Tauri dev server
pnpm run dev
