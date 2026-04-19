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

    # Phase 6: Memory injection from Memory MCP (port 3200)
    $EnableMemoryInjection = $true
    if ($EnableMemoryInjection) {
        try {
            $MemoryBridgeUrl = "http://localhost:3200"

            # Get memory context (recent work, patterns)
            $ContextBody = '{"method":"tools/call","params":{"name":"memory_get_context","arguments":{}}}'
            $ContextResp = Invoke-RestMethod -Uri $MemoryBridgeUrl -Method POST -Body $ContextBody -ContentType 'application/json' -TimeoutSec $TIMEOUT_SECONDS 2>$null

            # Get task suggestions
            $TaskBody = '{"method":"tools/call","params":{"name":"memory_suggest_task","arguments":{"limit":3}}}'
            $TaskResp = Invoke-RestMethod -Uri $MemoryBridgeUrl -Method POST -Body $TaskBody -ContentType 'application/json' -TimeoutSec $TIMEOUT_SECONDS 2>$null

            if (-not $Silent) {
                if ($ContextResp -or $TaskResp) {
                    Write-Host "MEMORY CONTEXT" -ForegroundColor Magenta

                    if ($ContextResp.result.content) {
                        $CtxData = $ContextResp.result.content[0].text | ConvertFrom-Json -ErrorAction SilentlyContinue
                        if ($CtxData.name) {
                            Write-Host "  Last project: $($CtxData.name)" -ForegroundColor White
                        }
                        if ($CtxData.currentTask) {
                            Write-Host "  Last task: $($CtxData.currentTask)" -ForegroundColor White
                        }
                        if ($CtxData.recentFiles -and $CtxData.recentFiles.Count -gt 0) {
                            Write-Host "  Recent files: $($CtxData.recentFiles[0..1] -join ', ')" -ForegroundColor DarkGray
                        }
                    }

                    if ($TaskResp.result.content) {
                        $TaskData = $TaskResp.result.content[0].text | ConvertFrom-Json -ErrorAction SilentlyContinue
                        if ($TaskData.suggestions -and $TaskData.suggestions.Count -gt 0) {
                            Write-Host "  Suggested next:" -ForegroundColor White
                            foreach ($sug in $TaskData.suggestions) {
                                Write-Host "    - $($sug.task)" -ForegroundColor DarkGray
                            }
                        }
                    }

                    Write-Host ""
                }
            }
        } catch {
            # Memory MCP unavailable — degrade gracefully, session starts normally
        }
    }

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

    # Phase 7 (2026-04-18): Craft daily-note awareness reminder
    # Stdout lines are picked up by Claude Code's native SessionStart hook contract
    # as system context. Terminal lines are visual confirmation for Bruce.
    try {
        $today = (Get-Date -Format 'yyyy-MM-dd')
        $reminderLines = @(
            "[CRAFT-DAILY-NOTE-CHECK]",
            "Date: $today",
            "Before responding to the user, fetch today's Craft daily note via the Craft MCP:",
            "  - Tool: documents_list  (location='daily_notes', dailyNoteDateGte='$today', dailyNoteDateLte='$today')",
            "  - If a doc exists, blocks_get the root and surface key items in 1-2 sentences.",
            "  - If none exists, do not auto-create. Offer to run /craft:daily-log."
        )
        $reminderLines | ForEach-Object { Write-Output $_ }
        if (-not $Silent) {
            Write-Host "CRAFT" -ForegroundColor Green
            Write-Host "  Will check today's daily note ($today)" -ForegroundColor DarkGray
            Write-Host ""
        }
    } catch {
        # Non-critical — session continues if Craft block fails
    }

} catch {
    if (-not $Silent) {
        Write-Host "Session start (non-critical error ignored)" -ForegroundColor Yellow
    }
}
