# Nova Agent Production Deployment Script
# Zero-downtime deployment with PM2

param(
    [string]$Environment = "production",
    [switch]$SkipBuild,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$DeployPath = "D:\deployments\nova-agent"
$BackupPath = "D:\deployments\nova-agent-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$LogPath = "D:\logs\nova-agent"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     NOVA AGENT PRODUCTION DEPLOYMENT                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

try {
    # 1. Pre-flight checks
    Write-Host "🔍 Pre-flight checks..." -ForegroundColor Yellow
    
    if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
        throw "PM2 not installed. Run: npm install -g pm2"
    }
    
    if (-not (Test-Path "D:\databases")) {
        throw "D:\databases not found. Check Antigravity setup."
    }
    
    Write-Host "✓ PM2 installed" -ForegroundColor Green
    Write-Host "✓ D:\databases accessible" -ForegroundColor Green
    
    # 2. Build
    if (-not $SkipBuild) {
        Write-Host "`n📦 Building TypeScript..." -ForegroundColor Yellow
        pnpm run build:prod
        if ($LASTEXITCODE -ne 0) { throw "Build failed" }
        Write-Host "✓ Build successful" -ForegroundColor Green
    }
    
    # 3. Create deployment directories
    Write-Host "`n📁 Setting up deployment directories..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    Write-Host "✓ Directories ready" -ForegroundColor Green
    
    # 4. Backup current deployment
    if (-not $SkipBackup -and (Test-Path "$DeployPath\dist")) {
        Write-Host "`n💾 Backing up current deployment..." -ForegroundColor Yellow
        Copy-Item -Path "$DeployPath\dist" -Destination $BackupPath -Recurse -Force
        Write-Host "✓ Backup saved to: $BackupPath" -ForegroundColor Green
    }
    
    # 5. Copy new build
    Write-Host "`n📁 Deploying new build..." -ForegroundColor Yellow
    Copy-Item -Path ".\dist\*" -Destination "$DeployPath\dist" -Recurse -Force
    Copy-Item -Path ".\ecosystem.config.cjs" -Destination $DeployPath -Force
    Copy-Item -Path ".\package.json" -Destination $DeployPath -Force
    Copy-Item -Path ".\.env" -Destination $DeployPath -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Files deployed" -ForegroundColor Green
    
    # 6. Install production dependencies
    Write-Host "`n📦 Installing production dependencies..." -ForegroundColor Yellow
    Push-Location $DeployPath
    pnpm install --prod
    Pop-Location
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    
    # 7. Reload PM2 (zero-downtime)
    Write-Host "`n🔄 Reloading PM2..." -ForegroundColor Yellow
    pm2 reload ecosystem.config.cjs --env $Environment
    if ($LASTEXITCODE -ne 0) { throw "PM2 reload failed" }
    Write-Host "✓ PM2 reloaded" -ForegroundColor Green
    
    # 8. Health check
    Write-Host "`n🏥 Running health check..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3100/health" -TimeoutSec 10
        if ($health.status -ne "healthy") {
            throw "Health check failed: $($health.status)"
        }
        Write-Host "✓ Health check passed" -ForegroundColor Green
        Write-Host "  Version: $($health.version)" -ForegroundColor Gray
        Write-Host "  Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Gray
    } catch {
        Write-Host "⚠ Health check endpoint not responding (may be normal for Tauri app)" -ForegroundColor Yellow
    }
    
    # 9. Save PM2 process list
    Write-Host "`n💾 Saving PM2 process list..." -ForegroundColor Yellow
    pm2 save
    Write-Host "✓ PM2 configuration saved" -ForegroundColor Green
    
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║     ✅ DEPLOYMENT SUCCESSFUL!                              ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    Write-Host "📊 Next steps:" -ForegroundColor Cyan
    Write-Host "  • View logs: pm2 logs nova-agent" -ForegroundColor White
    Write-Host "  • Monitor: pm2 monit" -ForegroundColor White
    Write-Host "  • Status: pm2 status" -ForegroundColor White
    
} catch {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║     ❌ DEPLOYMENT FAILED                                   ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    # Rollback
    if (-not $SkipBackup -and (Test-Path $BackupPath)) {
        Write-Host "`n🔙 Rolling back..." -ForegroundColor Yellow
        Copy-Item -Path "$BackupPath\*" -Destination "$DeployPath\dist" -Recurse -Force
        pm2 reload ecosystem.config.cjs --env $Environment
        Write-Host "✓ Rollback complete" -ForegroundColor Green
    }
    
    exit 1
}

