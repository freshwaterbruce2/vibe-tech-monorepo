# Setup Claude Code Environment Variables in PowerShell Profile
# Last Updated: 2026-01-16

$profileContent = @'

# ========================================
# Claude Code Configuration (2026)
# ========================================

# Token Limits
$env:CLAUDE_CODE_MAX_OUTPUT_TOKENS = 50000
$env:CLAUDE_CODE_MAX_CONTEXT_TOKENS = 180000
$env:CLAUDE_CODE_MAX_THINKING_TOKENS = 20000
$env:MAX_THINKING_TOKENS = 20000
$env:MAX_MCP_OUTPUT_TOKENS = 25000

# Timeouts (in seconds/milliseconds)
$env:CLAUDE_CODE_TIMEOUT = 300
$env:BASH_DEFAULT_TIMEOUT_MS = 60000
$env:BASH_MAX_TIMEOUT_MS = 300000
$env:MCP_TIMEOUT = 60000
$env:MCP_TOOL_TIMEOUT = 60000

# Output Limits
$env:CLAUDE_CODE_TERMINAL_OUTPUT_LIMIT = 50000
$env:BASH_MAX_OUTPUT_LENGTH = 50000

# Feature Flags
$env:CLAUDE_CODE_DISABLE_TELEMETRY = 1
$env:CLAUDE_CODE_SKIP_UPDATE_CHECK = 1
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1
$env:CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR = 1

# ========================================

'@

# Backup existing profile
if (Test-Path $PROFILE) {
    $backupPath = "$PROFILE.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $PROFILE $backupPath
    Write-Host "[OK] Backed up existing profile to: $backupPath" -ForegroundColor Green
}

# Add configuration to profile
Add-Content -Path $PROFILE -Value $profileContent
Write-Host "[OK] Added Claude Code configuration to: $PROFILE" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration includes:" -ForegroundColor Cyan
Write-Host "   - Max output tokens: 50000" -ForegroundColor Gray
Write-Host "   - Max context tokens: 180000" -ForegroundColor Gray
Write-Host "   - Max thinking tokens: 20000" -ForegroundColor Gray
Write-Host "   - Timeout: 300 seconds" -ForegroundColor Gray
Write-Host "   - Telemetry: Disabled" -ForegroundColor Gray
Write-Host "   - Update checks: Disabled" -ForegroundColor Gray
Write-Host ""
Write-Host "To apply changes, run: . `$PROFILE" -ForegroundColor Yellow
Write-Host "   Or restart your PowerShell session" -ForegroundColor Yellow
