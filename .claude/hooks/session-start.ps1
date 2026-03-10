#!/usr/bin/env powershell
# Session Start Hook - Robust Version with Timeout Protection
# Prevents Claude Code from hanging if memory system is unavailable

param(
    [string]$SessionId = "",
    [switch]$Silent = $false
)

$ErrorActionPreference = "SilentlyContinue"
$MemoryPath = "C:\dev\apps\memory-mcp"

# TIMEOUT: Maximum seconds to wait for any operation
$TIMEOUT_SECONDS = 2

function Get-EnhancedGitContext {
    $GitContext = @{
        branch = "unknown"
        modified_files = 0
        working_dir = (Get-Location).Path
    }

    try {
        $GitContext.branch = git branch --show-current 2>$null
        $Count = (git status --porcelain 2>$null | Measure-Object).Count
        $GitContext.modified_files = $Count
    } catch {
        # Keep defaults if git fails
    }

    return $GitContext
}

function Display-SimpleWelcome {
    param($GitContext)

    if ($Silent) { return }

    Write-Host ""
    Write-Host "CLAUDE CODE - Ready" -ForegroundColor Cyan
    Write-Host "Branch: $($GitContext.branch) | Modified: $($GitContext.modified_files) files" -ForegroundColor White
    Write-Host ""
}

# Main execution
try {
    # Generate session ID if not provided
    if (-not $SessionId) {
        $SessionId = "session-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }

    # Set session ID for other hooks to use
    $env:CLAUDE_SESSION_ID = $SessionId

    # Get git context (fast operation)
    $GitContext = Get-EnhancedGitContext

    # Display simple welcome (no hanging operations)
    Display-SimpleWelcome -GitContext $GitContext

    # Save session context to D:\logs\claude-sessions\
    try {
        $SessionDir = "D:\logs\claude-sessions"
        if (-not (Test-Path $SessionDir)) {
            New-Item -Path $SessionDir -ItemType Directory -Force | Out-Null
        }

        $SessionData = @{
            session_id = $SessionId
            start_time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            working_dir = $GitContext.working_dir
            branch = $GitContext.branch
            modified_files = $GitContext.modified_files
        } | ConvertTo-Json -Compress

        $SessionFile = Join-Path $SessionDir "$SessionId.json"
        $SessionData | Out-File -FilePath $SessionFile -Encoding utf8 -Force
    } catch {
        # Silently fail - session logging is non-critical
    }

} catch {
    if (-not $Silent) {
        Write-Host "Session start (non-critical error ignored)" -ForegroundColor Yellow
    }
}
