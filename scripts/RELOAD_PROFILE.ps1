# Reload PowerShell Profile
# This applies all environment variables to the current session

Write-Host "Reloading PowerShell profile..." -ForegroundColor Cyan
. $PROFILE
Write-Host "Profile reloaded!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying configuration..." -ForegroundColor Cyan
& "V:\monorepo\scripts\Verify-ClaudeConfig.ps1"
