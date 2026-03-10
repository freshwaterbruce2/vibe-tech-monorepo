# PM2 Production Environment Setup Script
# Sets up PM2, directories, and startup configuration

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PM2 PRODUCTION SETUP FOR NOVA AGENT                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

try {
    # 1. Check Node.js version
    Write-Host "🔍 Checking Node.js version..." -ForegroundColor Yellow
    $nodeVersion = node --version
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Gray
    
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -lt 22) {
            Write-Host "⚠ Warning: Node.js 22 LTS recommended (current: v$majorVersion)" -ForegroundColor Yellow
            Write-Host "  Node.js 20 reaches EOL in April 2026" -ForegroundColor Yellow
        } else {
            Write-Host "✓ Node.js version OK" -ForegroundColor Green
        }
    }
    
    # 2. Install PM2
    Write-Host "`n📦 Installing PM2..." -ForegroundColor Yellow
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        Write-Host "  PM2 already installed" -ForegroundColor Gray
        $pm2Version = pm2 --version
        Write-Host "  Version: $pm2Version" -ForegroundColor Gray
    } else {
        npm install -g pm2@latest
        if ($LASTEXITCODE -ne 0) { throw "PM2 installation failed" }
        Write-Host "✓ PM2 installed" -ForegroundColor Green
    }
    
    # 3. Install PM2 log rotation
    Write-Host "`n📋 Setting up log rotation..." -ForegroundColor Yellow
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
    Write-Host "✓ Log rotation configured" -ForegroundColor Green
    
    # 4. Create directory structure
    Write-Host "`n📁 Creating directory structure..." -ForegroundColor Yellow
    $directories = @(
        "D:\deployments\nova-agent",
        "D:\logs\nova-agent",
        "D:\databases"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor Gray
        } else {
            Write-Host "  Exists: $dir" -ForegroundColor Gray
        }
    }
    Write-Host "✓ Directories ready" -ForegroundColor Green
    
    # 5. Configure PM2 startup
    Write-Host "`n🚀 Configuring PM2 startup..." -ForegroundColor Yellow
    Write-Host "  Run this command to enable auto-start on boot:" -ForegroundColor Yellow
    Write-Host "  pm2 startup" -ForegroundColor Cyan
    Write-Host "`n  Then after starting your app, run:" -ForegroundColor Yellow
    Write-Host "  pm2 save" -ForegroundColor Cyan
    
    # 6. Create .env template if not exists
    Write-Host "`n📝 Checking environment configuration..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        Write-Host "  Creating .env template..." -ForegroundColor Gray
        @"
# Nova Agent Production Environment Variables
NODE_ENV=production
PORT=3100

# Database Paths (Antigravity Architecture)
DATABASE_PATH=D:\databases\nova_activity.db
LEARNING_DB_PATH=D:\databases\agent_learning.db
TASKS_DB_PATH=D:\databases\agent_tasks.db

# AI API Keys (REQUIRED)
DEEPSEEK_API_KEY=your_deepseek_key_here
GROQ_API_KEY=your_groq_key_here
HUGGINGFACE_API_KEY=your_huggingface_key_here

# Optional
LOG_LEVEL=info
MAX_MEMORY=1024
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✓ .env template created - PLEASE UPDATE WITH YOUR API KEYS" -ForegroundColor Yellow
    } else {
        Write-Host "✓ .env file exists" -ForegroundColor Green
    }
    
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║     ✅ PM2 SETUP COMPLETE!                                 ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    Write-Host "📊 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Update .env with your API keys" -ForegroundColor White
    Write-Host "  2. Build the project: pnpm run build:prod" -ForegroundColor White
    Write-Host "  3. Deploy: pnpm run deploy" -ForegroundColor White
    Write-Host "  4. Or start directly: pnpm run pm2:start" -ForegroundColor White
    Write-Host "`n  Monitor: pnpm run pm2:monit" -ForegroundColor Gray
    Write-Host "  Logs: pnpm run pm2:logs" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}

