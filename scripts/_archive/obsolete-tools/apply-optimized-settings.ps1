# Apply Optimized VS Code Settings
# Creates backup and applies recommended settings for monorepo workflow

$ErrorActionPreference = "Stop"

$settingsPath = Join-Path $PSScriptRoot "..\.vscode\settings.json"
$optimizedPath = Join-Path $PSScriptRoot "..\.vscode\settings.optimized.json"
$backupPath = Join-Path $PSScriptRoot "..\.vscode\settings.backup.$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"

Write-Host "VS Code Settings Optimizer" -ForegroundColor Cyan
Write-Host "=" * 50

# Check if optimized settings exist
if (-not (Test-Path $optimizedPath)) {
    Write-Host "❌ Error: Optimized settings file not found at:" -ForegroundColor Red
    Write-Host "   $optimizedPath" -ForegroundColor Red
    exit 1
}

# Check if current settings exist
if (-not (Test-Path $settingsPath)) {
    Write-Host "⚠️  Warning: No existing settings.json found" -ForegroundColor Yellow
    Write-Host "   Creating new settings file..." -ForegroundColor Yellow
    
    Copy-Item -Path $optimizedPath -Destination $settingsPath -Force
    Write-Host "✓ Created new settings.json with optimized configuration" -ForegroundColor Green
    exit 0
}

# Create backup
Write-Host "`n📦 Creating backup..." -ForegroundColor Cyan
Copy-Item -Path $settingsPath -Destination $backupPath -Force
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Show diff
Write-Host "`n📊 Comparing settings..." -ForegroundColor Cyan
$currentContent = Get-Content $settingsPath -Raw
$optimizedContent = Get-Content $optimizedPath -Raw

if ($currentContent -eq $optimizedContent) {
    Write-Host "✓ Settings are already optimized!" -ForegroundColor Green
    exit 0
}

# Ask for confirmation
Write-Host "`n⚠️  This will replace your current settings.json with optimized settings." -ForegroundColor Yellow
Write-Host "   Backup saved to: $backupPath" -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "Continue? (y/N)"

if ($response -ne 'y' -and $response -ne 'Y') {
    Write-Host "❌ Cancelled. No changes made." -ForegroundColor Red
    exit 0
}

# Apply optimized settings
Write-Host "`n🔧 Applying optimized settings..." -ForegroundColor Cyan
Copy-Item -Path $optimizedPath -Destination $settingsPath -Force
Write-Host "✓ Settings applied successfully!" -ForegroundColor Green

Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "  • Backup: $backupPath" -ForegroundColor White
Write-Host "  • Applied: $optimizedPath" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Recommended Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Reload VS Code window (Ctrl+Shift+P → 'Reload Window')" -ForegroundColor White
Write-Host "  2. Review VSCODE_SETTINGS_REVIEW_2026-01-12.md for details" -ForegroundColor White
Write-Host "  3. Choose your primary AI assistant (see review doc)" -ForegroundColor White
Write-Host ""
Write-Host "✨ Done! Your workspace is now optimized for monorepo development." -ForegroundColor Green

