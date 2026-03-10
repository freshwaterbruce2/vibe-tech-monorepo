# Fix Serena Auth Error
# Run this script to change token estimator from Anthropic API to offline method

$configPath = "$env:USERPROFILE\.serena\serena_config.yml"

Write-Host "=== Serena Auth Fix ===" -ForegroundColor Cyan

if (Test-Path $configPath) {
    Write-Host "Found config: $configPath" -ForegroundColor Green
    
    # Backup first
    $backupPath = "$configPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $configPath $backupPath
    Write-Host "Backup created: $backupPath" -ForegroundColor Yellow
    
    # Read and fix
    $content = Get-Content $configPath -Raw
    
    if ($content -match 'token_count_estimator:\s*ANTHROPIC_CLAUDE_SONNET_4') {
        $newContent = $content -replace 'token_count_estimator:\s*ANTHROPIC_CLAUDE_SONNET_4', 'token_count_estimator: CHARACTERS_DIV_4'
        Set-Content $configPath $newContent
        Write-Host "FIXED: Changed token_count_estimator to CHARACTERS_DIV_4" -ForegroundColor Green
    } else {
        Write-Host "Token estimator already set to non-API method or not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "Config not found at: $configPath" -ForegroundColor Red
    Write-Host "Serena may not be installed or configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next: Restart Claude Code to apply changes" -ForegroundColor Cyan
