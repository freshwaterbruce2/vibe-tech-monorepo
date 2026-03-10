<#
.SYNOPSIS
    Vibe Finisher - Single Iteration Runner (v7 - BATCH MODE)
#>

param(
    [string]$ConfigPath = ".\finisher.yaml",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Load config
if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config not found: $ConfigPath"
    exit 1
}

# Parse YAML
$config = @{}
Get-Content $ConfigPath | ForEach-Object {
    if ($_ -match '^(\w+):\s*(.+)$') {
        $config[$matches[1]] = $matches[2].Trim()
    }
}

$targetProject = $config['targetProject']

if (-not $targetProject -or -not (Test-Path $targetProject)) {
    Write-Error "Target project not found: $targetProject"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " VIBE FINISHER - Single Pass (BATCH)" -ForegroundColor Cyan
Write-Host " Target: $targetProject" -ForegroundColor Yellow
Write-Host " Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

# BATCH MODE - fix ALL errors of the same type in one pass
$prompt = "You are autonomous. No questions. No permission. Just fix code. Run npx tsc --noEmit. Look at ALL errors. Group them by error type (e.g. TS4111, TS2307, TS2345). Pick the error type with the MOST occurrences. Fix ALL instances of that error type across ALL files. Then run tsc again. Output: [STATUS] fixed ERROR_CODE in N files [ERRORS_BEFORE] N [ERRORS_AFTER] N [SHIP_READY] YES or NO. Go."

# Output file
$outputDir = Join-Path $ScriptDir "output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outputFile = Join-Path $outputDir "run_$timestamp.jsonl"

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would execute in: $targetProject" -ForegroundColor Yellow
    Write-Host "`nPrompt: $prompt" -ForegroundColor Gray
    exit 0
}

Write-Host "`n[RUNNING] Claude agent (BATCH MODE)..." -ForegroundColor Green

# Change to target project directory
Push-Location $targetProject
try {
    Write-Host "[DEBUG] Dir: $(Get-Location)" -ForegroundColor DarkGray
    
    $claudeArgs = @(
        '--print'
        '--dangerously-skip-permissions'
        $prompt
    )
    
    $output = & claude.cmd @claudeArgs 2>&1
    $exitCode = $LASTEXITCODE
    
    # Display output
    Write-Host "`n--- AGENT OUTPUT ---" -ForegroundColor Magenta
    $output | ForEach-Object { Write-Host $_ }
    Write-Host "--- END OUTPUT ---" -ForegroundColor Magenta
    
    # Save to log
    $output | Out-File $outputFile -Encoding UTF8
}
finally {
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Pass Complete" -ForegroundColor Green
Write-Host " Output: $outputFile" -ForegroundColor Gray
Write-Host " Exit Code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan

exit $exitCode
