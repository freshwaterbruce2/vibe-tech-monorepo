# Verify Claude Code Configuration
# Last Updated: 2026-01-16

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Claude Code Environment Configuration' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Reload profile to ensure latest config
. $PROFILE

Write-Host 'Token Limits:' -ForegroundColor Yellow
Write-Host "  CLAUDE_CODE_MAX_OUTPUT_TOKENS:   $env:CLAUDE_CODE_MAX_OUTPUT_TOKENS"
Write-Host "  CLAUDE_CODE_MAX_CONTEXT_TOKENS:  $env:CLAUDE_CODE_MAX_CONTEXT_TOKENS"
Write-Host "  CLAUDE_CODE_MAX_THINKING_TOKENS: $env:CLAUDE_CODE_MAX_THINKING_TOKENS"
Write-Host "  MAX_THINKING_TOKENS:             $env:MAX_THINKING_TOKENS"
Write-Host "  MAX_MCP_OUTPUT_TOKENS:           $env:MAX_MCP_OUTPUT_TOKENS"
Write-Host ''

Write-Host 'Timeouts:' -ForegroundColor Yellow
Write-Host "  CLAUDE_CODE_TIMEOUT:      $env:CLAUDE_CODE_TIMEOUT seconds"
Write-Host "  BASH_DEFAULT_TIMEOUT_MS:  $env:BASH_DEFAULT_TIMEOUT_MS ms"
Write-Host "  BASH_MAX_TIMEOUT_MS:      $env:BASH_MAX_TIMEOUT_MS ms"
Write-Host "  MCP_TIMEOUT:              $env:MCP_TIMEOUT ms"
Write-Host "  MCP_TOOL_TIMEOUT:         $env:MCP_TOOL_TIMEOUT ms"
Write-Host ''

Write-Host 'Output Limits:' -ForegroundColor Yellow
Write-Host "  CLAUDE_CODE_TERMINAL_OUTPUT_LIMIT: $env:CLAUDE_CODE_TERMINAL_OUTPUT_LIMIT"
Write-Host "  BASH_MAX_OUTPUT_LENGTH:            $env:BASH_MAX_OUTPUT_LENGTH"
Write-Host ''

Write-Host 'Feature Flags:' -ForegroundColor Yellow
Write-Host "  CLAUDE_CODE_DISABLE_TELEMETRY:            $env:CLAUDE_CODE_DISABLE_TELEMETRY"
Write-Host "  CLAUDE_CODE_SKIP_UPDATE_CHECK:            $env:CLAUDE_CODE_SKIP_UPDATE_CHECK"
Write-Host "  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: $env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"
Write-Host "  CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: $env:CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR"
Write-Host ''

# Check for any missing variables
$requiredVars = @(
    'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
    'CLAUDE_CODE_MAX_CONTEXT_TOKENS',
    'CLAUDE_CODE_MAX_THINKING_TOKENS',
    'MAX_THINKING_TOKENS',
    'MAX_MCP_OUTPUT_TOKENS',
    'CLAUDE_CODE_TIMEOUT',
    'BASH_DEFAULT_TIMEOUT_MS',
    'BASH_MAX_TIMEOUT_MS',
    'MCP_TIMEOUT',
    'MCP_TOOL_TIMEOUT',
    'CLAUDE_CODE_TERMINAL_OUTPUT_LIMIT',
    'BASH_MAX_OUTPUT_LENGTH',
    'CLAUDE_CODE_DISABLE_TELEMETRY',
    'CLAUDE_CODE_SKIP_UPDATE_CHECK',
    'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    'CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR'
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var)
    if (-not $value) {
        $missingVars += $var
    }
}

Write-Host '========================================' -ForegroundColor Cyan
if ($missingVars.Count -eq 0) {
    Write-Host 'Configuration Status: VERIFIED' -ForegroundColor Green
    Write-Host 'All environment variables are set!' -ForegroundColor Green
} else {
    Write-Host 'Configuration Status: INCOMPLETE' -ForegroundColor Yellow
    Write-Host "Missing variables: $($missingVars -join ', ')" -ForegroundColor Yellow
    Write-Host 'Run: . $PROFILE to reload configuration' -ForegroundColor Yellow
}
Write-Host '========================================' -ForegroundColor Cyan
