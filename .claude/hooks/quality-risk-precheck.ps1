#!/usr/bin/env powershell
# PreToolUse hook — runs ML quality risk prediction before Edit or Write on TypeScript files.
# Fires BEFORE the edit happens so Claude can pre-empt likely quality failures.
# Outputs a warning block if high-risk rubrics are predicted to fail.
# Exit 0 always — never blocks the tool call.

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop
    $toolName = $hookData.tool_name

    if ($toolName -notin @('Edit', 'Write')) { exit 0 }

    $filePath = $hookData.tool_input.file_path
    if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }

    # Only predict on TypeScript/TSX source files
    if ($filePath -notmatch '\.(ts|tsx)$') { exit 0 }

    # Skip test files
    if ($filePath -match '\.(test|spec)\.(ts|tsx)$') { exit 0 }
    if ($filePath -match '[\\/](__tests__|tests)[\\/]') { exit 0 }

    # Normalise path separators for Python
    $normalPath = $filePath -replace '\\', '/'

    # Call inference model (5s timeout — never block on model load)
    $pyScript = @"
import sys, json
sys.path.insert(0, 'D:/data/models')
try:
    from infer import predict_quality_risks
    r = predict_quality_risks('$normalPath')
    print(json.dumps(r))
except Exception as e:
    print(json.dumps({'error': str(e)}))
"@

    $raw = & python -c $pyScript 2>$null
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

    $prediction = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($prediction.error) { exit 0 }

    # Only warn when at least one rubric is predicted to fail
    $fails = @()
    if ($prediction.no_nonnull -eq 'FAIL')    { $fails += 'no_nonnull (avoid !)' }
    if ($prediction.no_console -eq 'FAIL')    { $fails += 'no_console (remove console.*)' }
    if ($prediction.search_first -eq 'FAIL')  { $fails += 'search_first (search before creating)' }

    if ($fails.Count -eq 0) { exit 0 }

    $riskLevel = $prediction.risk_level.ToUpper()
    $failList  = $fails -join ', '

    Write-Output ""
    Write-Output "-- Quality Risk [$riskLevel] $($filePath.Split('/')[-1].Split('\')[-1]) --"
    Write-Output "  Predicted to fail: $failList"
    Write-Output "  $($prediction.advice)"
    Write-Output "-------------------------------------------------------"
    Write-Output ""

} catch {
    # Silent — never block
}

exit 0
