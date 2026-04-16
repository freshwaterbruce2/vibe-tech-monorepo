#!/usr/bin/env powershell
# PostToolUse hook — Phase 3 skill evolution.
#
# Fires after Edit/Write on TypeScript files (same matcher as lats-self-critique).
# Strategy:
#   1. Count low-score critiques (< 0.8) in the last 24h
#   2. Every 10th low-score critique, derive the relevant skill from the file path
#   3. Pick mutation type from dominant violation category
#   4. Run `lats skill mutate` and auto-deploy if promoted (delta > 0.02)

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop
    $toolName  = $hookData.tool_name

    if ($toolName -notin @('Edit', 'Write')) { exit 0 }

    $filePath = if ($hookData.tool_input.file_path) { $hookData.tool_input.file_path }
                elseif ($hookData.tool_input.path)   { $hookData.tool_input.path }
                else                                  { '' }

    # Only TypeScript source files (skip tests)
    if ($filePath -notmatch '\.(ts|tsx)$')            { exit 0 }
    if ($filePath -match '\.(test|spec)\.(ts|tsx)$')  { exit 0 }

    $CLI     = 'node'
    $CLIPath = 'C:\dev\packages\agent-lats\dist\cli.js'
    $dbPath  = if ($env:AGENT_LATS_DB_PATH) { $env:AGENT_LATS_DB_PATH } else { 'D:\databases\agent_learning.db' }

    # Count low-score critiques in last 24h
    $lowScoreCount = & sqlite3 $dbPath `
        "SELECT COUNT(*) FROM self_critiques WHERE static_score < 0.8 AND created_at > datetime('now', '-24 hours');" `
        2>$null

    $count = [int]($lowScoreCount -replace '\D', '')
    if ($count -lt 10)          { exit 0 }   # Not enough data yet
    if ($count % 10 -ne 0)      { exit 0 }   # Only fire on every 10th

    # Determine dominant violation type to pick mutation
    $violRow = & sqlite3 $dbPath @"
SELECT
  SUM(CASE WHEN rubric_no_console = 0 OR rubric_no_mock = 0 OR rubric_no_any = 0 OR rubric_no_nonnull = 0 THEN 1 ELSE 0 END),
  SUM(CASE WHEN rubric_search_first = 0 OR rubric_type_imports = 0 OR rubric_no_react_default = 0 OR rubric_no_react_fc = 0 THEN 1 ELSE 0 END)
FROM self_critiques
WHERE static_score < 0.8 AND created_at > datetime('now', '-24 hours');
"@ 2>$null

    $mutationType = 'add_guardrails'
    if ($violRow) {
        $parts = ($violRow -split '\|')
        if ($parts.Length -eq 2 -and [int]$parts[1] -gt [int]$parts[0]) {
            $mutationType = 'add_examples'
        }
    }

    # Map file path → skill name
    $skillName = 'typescript-expert'
    if      ($filePath -match 'apps/vibe-tutor')    { $skillName = 'react-best-practices' }
    elseif  ($filePath -match 'apps/nova-agent')    { $skillName = 'desktop-expert' }
    elseif  ($filePath -match 'apps/crypto')        { $skillName = 'crypto' }
    elseif  ($filePath -match '\.tsx$')             { $skillName = 'react-patterns' }
    elseif  ($filePath -match 'packages/')          { $skillName = 'typescript-expert' }

    Write-Host "[LATS P3] $count low-score critiques → evolving '$skillName' via '$mutationType'"

    $resultJson = (& $CLI $CLIPath skill mutate --name $skillName --type $mutationType --json 2>$null) -join "`n"
    if (-not $resultJson) {
        Write-Host "[LATS P3] Skipped — skill '$skillName' not found on disk"
        exit 0
    }

    $result    = $resultJson | ConvertFrom-Json -ErrorAction Stop
    $delta     = [math]::Round([double]$result.delta, 3)
    $variantId = $result.variantId

    if ($result.promoted -and $variantId) {
        & $CLI $CLIPath skill deploy --variant $variantId 2>$null | Out-Null
        Write-Host "[LATS P3] Deployed '$skillName' v$($result.mutated.version ?? $result.version) (delta=+$delta, score=$($result.mutatedScore))"
    } else {
        Write-Host "[LATS P3] Not promoted (delta=$delta) — keeping current '$skillName'"
    }

} catch {
    exit 0
}
