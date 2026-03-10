#!/usr/bin/env powershell
# Hook Validation Script
# Tests that hooks are properly configured and receiving data

param(
    [switch]$Verbose
)

Write-Host "`n=== Claude Code Hook Validation ===" -ForegroundColor Cyan

# Test 1: Check hooks exist
Write-Host "`n[1/5] Checking hook files exist..." -ForegroundColor Yellow
$HookFiles = @(
    ".claude/hooks/pre-tool-use.ps1",
    ".claude/hooks/post-tool-use.ps1"
)

$AllExist = $true
foreach ($HookFile in $HookFiles) {
    if (Test-Path $HookFile) {
        Write-Host "  OK $HookFile exists" -ForegroundColor Green
    } else {
        Write-Host "  FAIL $HookFile missing!" -ForegroundColor Red
        $AllExist = $false
    }
}

# Test 2: Simulate hook execution with test JSON
Write-Host "`n[2/5] Testing hook data parsing..." -ForegroundColor Yellow

$TestPreToolJson = @{
    session_id = "test-session"
    tool_name = "TestTool"
    tool_input = @{ test_param = "test_value" }
    hook_event_name = "PreToolUse"
} | ConvertTo-Json

$TestPostToolJson = @{
    session_id = "test-session"
    tool_name = "TestTool"
    tool_input = @{ test_param = "test_value" }
    tool_response = @{ success = $true }
    hook_event_name = "PostToolUse"
} | ConvertTo-Json

try {
    # Test pre-tool-use hook
    $TestPreToolJson | & powershell -NoProfile -ExecutionPolicy Bypass -File ".claude/hooks/pre-tool-use.ps1" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK pre-tool-use.ps1 executed successfully" -ForegroundColor Green
    } else {
        Write-Host "  FAIL pre-tool-use.ps1 failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }

    # Test post-tool-use hook
    $TestPostToolJson | & powershell -NoProfile -ExecutionPolicy Bypass -File ".claude/hooks/post-tool-use.ps1" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK post-tool-use.ps1 executed successfully" -ForegroundColor Green
    } else {
        Write-Host "  FAIL post-tool-use.ps1 failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
} catch {
    Write-Host "  FAIL Hook execution error: $_" -ForegroundColor Red
}

# Test 3: Verify database has recent data
Write-Host "`n[3/5] Checking database for recent activity..." -ForegroundColor Yellow

$DbPath = "D:\learning-system\agent_learning.db"
if (Test-Path $DbPath) {
    try {
        # Query for recent executions
        $Query1 = "SELECT COUNT(*) FROM agent_executions WHERE started_at > datetime('now', '-1 hour');"
        $RecentCount = & sqlite3 $DbPath $Query1 2>$null

        # Query for Unknown tool names
        $Query2 = "SELECT COUNT(*) FROM agent_executions WHERE tools_used = 'Unknown' AND started_at > datetime('now', '-1 hour');"
        $UnknownCount = & sqlite3 $DbPath $Query2 2>$null

        # Query for incomplete executions
        $Query3 = "SELECT COUNT(*) FROM agent_executions WHERE completed_at IS NULL AND started_at > datetime('now', '-1 hour');"
        $IncompleteCount = & sqlite3 $DbPath $Query3 2>$null

        Write-Host "  OK Recent executions (last hour): $RecentCount" -ForegroundColor Green

        if ($UnknownCount -gt 0) {
            Write-Host "  WARN 'Unknown' tool names: $UnknownCount (should be 0!)" -ForegroundColor Yellow
        } else {
            Write-Host "  OK No 'Unknown' tool names" -ForegroundColor Green
        }

        if ($IncompleteCount -gt 0) {
            Write-Host "  WARN Incomplete executions: $IncompleteCount (POST-TOOL hooks may be failing)" -ForegroundColor Yellow
        } else {
            Write-Host "  OK All executions completed" -ForegroundColor Green
        }
    } catch {
        Write-Host "  FAIL Database query failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  FAIL Database not found at $DbPath" -ForegroundColor Red
}

# Test 4: Check logs for actual tool names
Write-Host "`n[4/5] Checking logs for tool name diversity..." -ForegroundColor Yellow

$LogFile = "D:\learning-system\logs\tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log"
if (Test-Path $LogFile) {
    $LogContent = Get-Content $LogFile -ErrorAction SilentlyContinue
    $ToolNames = $LogContent | Select-String "Tool: (\w+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -Unique

    if ($ToolNames -contains "Unknown") {
        Write-Host "  WARN Logs contain 'Unknown' tool names - hooks may not be parsing stdin correctly" -ForegroundColor Yellow
    } else {
        Write-Host "  OK No 'Unknown' tool names in today's logs" -ForegroundColor Green
    }

    if ($Verbose) {
        Write-Host "  Tool names found: $($ToolNames -join ', ')" -ForegroundColor Cyan
    }
} else {
    Write-Host "  WARN No log file for today" -ForegroundColor Yellow
}

# Test 5: Verify settings.json configuration
Write-Host "`n[5/5] Checking settings.json configuration..." -ForegroundColor Yellow

$SettingsPath = ".claude/settings.json"
if (Test-Path $SettingsPath) {
    $Settings = Get-Content $SettingsPath | ConvertFrom-Json

    if ($Settings.hooks.PreToolUse) {
        Write-Host "  OK PreToolUse hooks configured" -ForegroundColor Green
    } else {
        Write-Host "  FAIL PreToolUse hooks not configured!" -ForegroundColor Red
    }

    if ($Settings.hooks.PostToolUse) {
        Write-Host "  OK PostToolUse hooks configured" -ForegroundColor Green
    } else {
        Write-Host "  FAIL PostToolUse hooks not configured!" -ForegroundColor Red
    }
} else {
    Write-Host "  FAIL settings.json not found!" -ForegroundColor Red
}

# Summary
Write-Host "`n=== Validation Complete ===" -ForegroundColor Cyan
Write-Host "Run with -Verbose for detailed output" -ForegroundColor Gray
Write-Host ""
