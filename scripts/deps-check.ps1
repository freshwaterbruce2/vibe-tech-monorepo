# deps-check.ps1
# Check and update dependencies manually
# Usage: .\scripts\deps-check.ps1 [-Update] [-Audit]

param(
  [switch]$Update,
  [switch]$Audit,
  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
Set-Location "C:\dev"

Write-Host "`n📦 Dependency Check - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# Check for outdated packages
Write-Host "`n🔍 Checking for outdated packages..." -ForegroundColor Yellow
pnpm outdated 2>$null

if ($Audit) {
  Write-Host "`n🔒 Running security audit..." -ForegroundColor Yellow
  pnpm audit
}

if ($Update -and -not $Interactive) {
  Write-Host "`n⬆️ Updating dependencies (minor/patch only)..." -ForegroundColor Yellow
  pnpm update
  Write-Host "✅ Dependencies updated" -ForegroundColor Green
}

if ($Interactive) {
  Write-Host "`n⬆️ Interactive update mode..." -ForegroundColor Yellow
  pnpm update -i
}

# Check NX workspace
Write-Host "`n🔧 Checking NX migrations..." -ForegroundColor Yellow
$migrations = pnpm exec nx migrate --run-migrations=false 2>&1
if ($migrations -match "No migrations") {
  Write-Host "✅ NX is up to date" -ForegroundColor Green
}
else {
  Write-Host "⚠️ NX migrations available. Run: pnpm exec nx migrate latest" -ForegroundColor Yellow
}

Write-Host "`n📋 Summary" -ForegroundColor Cyan
Write-Host "  - Run 'pnpm update' for minor/patch updates"
Write-Host "  - Run 'pnpm update -i' for interactive selection"
Write-Host "  - Run 'pnpm exec nx migrate latest' for NX updates"
Write-Host "  - Renovate will auto-create PRs on weekends"
