# Serena MCP Server Verification Script
# Last Updated: 2026-01-06
# Purpose: Verify Serena is properly configured with 2026 best practices

Write-Host "`n=== Serena MCP Server Verification (2026) ===`n" -ForegroundColor Cyan

$results = @{
    Passed = 0
    Failed = 0
    Warnings = 0
}

# Test 1: Global Config Exists
Write-Host "[1/10] Checking global Serena configuration..." -NoNewline
$globalConfig = "$env:USERPROFILE\.serena\serena_config.yml"
if (Test-Path $globalConfig) {
    Write-Host " PASS" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "       Expected: $globalConfig" -ForegroundColor Yellow
    $results.Failed++
}

# Test 2: Project Config Exists
Write-Host "[2/10] Checking project Serena configuration..." -NoNewline
$projectConfig = "C:\dev\.serena\project.yml"
if (Test-Path $projectConfig) {
    Write-Host " PASS" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $results.Failed++
}

# Test 3: Memories Directory
Write-Host "[3/10] Checking memories directory..." -NoNewline
$memoriesDir = "C:\dev\.serena\memories"
if (Test-Path $memoriesDir) {
    $memCount = (Get-ChildItem $memoriesDir -Filter *.md).Count
    Write-Host " PASS ($memCount memories)" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $results.Failed++
}

# Test 4: MCP Configuration
Write-Host "[4/10] Checking .mcp.json configuration..." -NoNewline
$mcpConfig = "C:\dev\.mcp.json"
if (Test-Path $mcpConfig) {
    $content = Get-Content $mcpConfig -Raw
    if ($content -match '"serena"') {
        Write-Host " PASS" -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host " FAIL (Serena not in config)" -ForegroundColor Red
        $results.Failed++
    }
} else {
    Write-Host " FAIL" -ForegroundColor Red
    $results.Failed++
}

# Test 5: uvx Installation
Write-Host "[5/10] Checking uvx installation..." -NoNewline
$uvx = Get-Command uvx -ErrorAction SilentlyContinue
if ($uvx) {
    Write-Host " PASS" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host " WARN (not found - Serena may use fallback)" -ForegroundColor Yellow
    $results.Warnings++
}

# Test 6: Project Config - Context Mode
Write-Host "[6/10] Checking context mode configuration..." -NoNewline
if (Test-Path $projectConfig) {
    $content = Get-Content $projectConfig -Raw
    if ($content -match 'context:\s*agent') {
        Write-Host " PASS (agent mode)" -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host " WARN (not agent mode)" -ForegroundColor Yellow
        $results.Warnings++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Gray
}

# Test 7: Project Config - Optional Tools
Write-Host "[7/10] Checking optional tools enabled..." -NoNewline
if (Test-Path $projectConfig) {
    $content = Get-Content $projectConfig -Raw
    $toolsEnabled = ($content -match 'execute_shell_command') -and 
                    ($content -match 'write_memory')
    if ($toolsEnabled) {
        Write-Host " PASS" -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host " WARN (some tools missing)" -ForegroundColor Yellow
        $results.Warnings++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Gray
}

# Test 8: Global Config - Performance Settings
Write-Host "[8/10] Checking performance optimizations..." -NoNewline
if (Test-Path $globalConfig) {
    $content = Get-Content $globalConfig -Raw
    $optimized = ($content -match 'default_max_tool_answer_chars:\s*200000') -and
                 ($content -match 'tool_timeout:\s*300')
    if ($optimized) {
        Write-Host " PASS" -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host " WARN (not optimized for 2026)" -ForegroundColor Yellow
        $results.Warnings++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Gray
}

# Test 9: Global Config - Token Estimator
Write-Host "[9/10] Checking token count estimator..." -NoNewline
if (Test-Path $globalConfig) {
    $content = Get-Content $globalConfig -Raw
    if ($content -match 'token_count_estimator:\s*ANTHROPIC_CLAUDE_SONNET_4') {
        Write-Host " PASS (Anthropic API)" -ForegroundColor Green
        $results.Passed++
    } else {
        Write-Host " WARN (using different estimator)" -ForegroundColor Yellow
        $results.Warnings++
    }
} else {
    Write-Host " SKIP" -ForegroundColor Gray
}

# Test 10: Rules Documentation
Write-Host "[10/10] Checking documentation..." -NoNewline
$rulesFile = "C:\dev\.claude\rules\serena-mcp-guide.md"
if (Test-Path $rulesFile) {
    Write-Host " PASS" -ForegroundColor Green
    $results.Passed++
} else {
    Write-Host " WARN (guide not found)" -ForegroundColor Yellow
    $results.Warnings++
}

# Summary
Write-Host "`n=== Verification Summary ===" -ForegroundColor Cyan
Write-Host "Passed:   $($results.Passed)" -ForegroundColor Green
Write-Host "Failed:   $($results.Failed)" -ForegroundColor Red
Write-Host "Warnings: $($results.Warnings)" -ForegroundColor Yellow

# Overall Status
if ($results.Failed -eq 0) {
    Write-Host "`nSerena MCP is properly configured! " -NoNewline -ForegroundColor Green
    Write-Host "Ready to use." -ForegroundColor White
    
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Restart Claude Code to activate Serena" -ForegroundColor White
    Write-Host "2. Check dashboard: http://localhost:24282/dashboard/" -ForegroundColor White
    Write-Host "3. Test with: 'activate the project C:\dev'" -ForegroundColor White
    Write-Host "4. Browse memories: list_memories" -ForegroundColor White
} else {
    Write-Host "`nConfiguration issues detected! " -NoNewline -ForegroundColor Red
    Write-Host "Review failed tests above." -ForegroundColor White
    Write-Host "`nTo fix, re-run setup or check:" -ForegroundColor Yellow
    Write-Host "- .claude/rules/serena-mcp-guide.md" -ForegroundColor White
}

Write-Host ""
