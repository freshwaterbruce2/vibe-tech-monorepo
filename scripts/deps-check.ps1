# deps-check.ps1
# Check and update dependencies manually
# Usage: .\scripts\deps-check.ps1 [-Update] [-Audit]

param(
  [switch]$Update,
  [switch]$Audit,
  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
Set-Location "V:\monorepo"

function Test-GitWorktreeDirty {
  $status = git status --porcelain 2>$null
  return [bool]$status
}

Write-Host "`nDependency Check - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Gray

# Check for outdated packages
Write-Host "`nChecking for outdated packages..." -ForegroundColor Yellow
pnpm outdated 2>$null

if ($Audit) {
  Write-Host "`nRunning security audit..." -ForegroundColor Yellow
  pnpm audit
}

if ($Update -and -not $Interactive) {
  Write-Host "`nUpdating dependencies (minor/patch only)..." -ForegroundColor Yellow
  pnpm update
  Write-Host "Dependencies updated" -ForegroundColor Green
}

if ($Interactive) {
  Write-Host "`nInteractive update mode..." -ForegroundColor Yellow
  pnpm update -i
}

# Check NX workspace
Write-Host "`nChecking NX migrations..." -ForegroundColor Yellow
if (Test-GitWorktreeDirty) {
  Write-Host "Git status is dirty. Do not run Nx migrations or the Nx Console Migrate UI yet." -ForegroundColor Yellow
  Write-Host "   Isolate migration work first, then record the base/head used for affected checks." -ForegroundColor Yellow
}
else {
  $migrations = pnpm exec nx migrate --run-migrations=false 2>&1
  if ($migrations -match "No migrations") {
    Write-Host "NX is up to date" -ForegroundColor Green
  }
  else {
    Write-Host "NX migrations available. Isolate the work before running: pnpm exec nx migrate latest" -ForegroundColor Yellow
  }
}

Write-Host "`nSummary" -ForegroundColor Cyan
Write-Host "  - Run 'pnpm update' for minor/patch updates"
Write-Host "  - Run 'pnpm update -i' for interactive selection"
Write-Host "  - Run 'pnpm exec nx migrate latest' only from a clean, migration-only worktree"
Write-Host "  - Renovate will auto-create PRs on weekends"
