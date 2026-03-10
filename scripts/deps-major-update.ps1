# deps-major-update.ps1
# Safely update a major dependency with backup
# Usage: .\scripts\deps-major-update.ps1 -Package "react"

param(
  [Parameter(Mandatory = $true)]
  [string]$Package
)

$ErrorActionPreference = "Stop"
Set-Location "C:\dev"

Write-Host "`n⚠️ Major Update: $Package" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Gray

# Create backup first
$BackupName = "pre-update-$Package-$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
Write-Host "`n📦 Creating backup..." -ForegroundColor Cyan
Compress-Archive -Path ".\package.json", ".\pnpm-lock.yaml", ".\apps", ".\packages" -DestinationPath ".\_backups\$BackupName" -CompressionLevel Fastest
Write-Host "✅ Backup created: .\_backups\$BackupName" -ForegroundColor Green

# Show current version
Write-Host "`n📋 Current version:" -ForegroundColor Cyan
pnpm list $Package --depth=0

# Update package
Write-Host "`n⬆️ Updating $Package to latest..." -ForegroundColor Yellow
pnpm update $Package --latest

# Run tests
Write-Host "`n🧪 Running affected tests..." -ForegroundColor Cyan
pnpm nx affected --target=test --base=HEAD~1

# Show new version
Write-Host "`n📋 New version:" -ForegroundColor Cyan
pnpm list $Package --depth=0

Write-Host "`n✅ Update complete. If issues occur, restore from: .\_backups\$BackupName" -ForegroundColor Green
