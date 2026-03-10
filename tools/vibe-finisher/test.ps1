<#
.SYNOPSIS
    Test Vibe Finisher without using Claude API
.DESCRIPTION
    Simulates the finisher workflow to verify setup is correct
    before running actual agent.
#>

param(
    [string]$TargetProject = $null
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host @"

 ████████╗███████╗███████╗████████╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗
 ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝
    ██║   █████╗  ███████╗   ██║       ██╔████╔██║██║   ██║██║  ██║█████╗  
    ██║   ██╔══╝  ╚════██║   ██║       ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  
    ██║   ███████╗███████║   ██║       ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗
    ╚═╝   ╚══════╝╚══════╝   ╚═╝       ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
                                                                            
                    Testing Vibe Finisher Setup (No API calls)

"@ -ForegroundColor Cyan

$allGood = $true

# Test 1: Config exists
Write-Host "[TEST 1] Checking finisher.yaml..." -NoNewline
$configPath = Join-Path $ScriptDir "finisher.yaml"
if (Test-Path $configPath) {
    Write-Host " OK" -ForegroundColor Green
    $config = Get-Content $configPath -Raw
    if ($config -match 'targetProject:\s*(.+)') {
        $targetFromConfig = $matches[1].Trim()
        Write-Host "         Target: $targetFromConfig" -ForegroundColor Gray
    }
}
else {
    Write-Host " MISSING" -ForegroundColor Red
    $allGood = $false
}

# Test 2: Prompt exists
Write-Host "[TEST 2] Checking prompt.md..." -NoNewline
$promptPath = Join-Path $ScriptDir "prompt.md"
if (Test-Path $promptPath) {
    $prompt = Get-Content $promptPath -Raw
    $lines = ($prompt -split "`n").Count
    Write-Host " OK ($lines lines)" -ForegroundColor Green
}
else {
    Write-Host " MISSING" -ForegroundColor Red
    $allGood = $false
}

# Test 3: Scripts exist
Write-Host "[TEST 3] Checking scripts..." -NoNewline
$scripts = @("sync.ps1", "ralph.ps1", "init.ps1")
$missing = $scripts | Where-Object { -not (Test-Path (Join-Path $ScriptDir $_)) }
if ($missing.Count -eq 0) {
    Write-Host " OK" -ForegroundColor Green
}
else {
    Write-Host " MISSING: $($missing -join ', ')" -ForegroundColor Red
    $allGood = $false
}

# Test 4: Claude CLI
Write-Host "[TEST 4] Checking Claude CLI..." -NoNewline
try {
    $claudeVersion = & claude --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK ($claudeVersion)" -ForegroundColor Green
    }
    else {
        Write-Host " NOT FOUND" -ForegroundColor Yellow
        Write-Host "         Install: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
        $allGood = $false
    }
}
catch {
    Write-Host " NOT FOUND" -ForegroundColor Yellow
    Write-Host "         Install: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
    $allGood = $false
}

# Test 5: API Key
Write-Host "[TEST 5] Checking ANTHROPIC_API_KEY..." -NoNewline
if ($env:ANTHROPIC_API_KEY) {
    $keyPreview = $env:ANTHROPIC_API_KEY.Substring(0, 10) + "..."
    Write-Host " OK ($keyPreview)" -ForegroundColor Green
}
else {
    Write-Host " NOT SET" -ForegroundColor Yellow
    Write-Host "         Set: `$env:ANTHROPIC_API_KEY = 'your-key'" -ForegroundColor Yellow
    $allGood = $false
}

# Test 6: Target project (if specified or in config)
$projectToTest = if ($TargetProject) { $TargetProject } else { $targetFromConfig }
if ($projectToTest) {
    Write-Host "[TEST 6] Checking target project..." -NoNewline
    if (Test-Path $projectToTest) {
        Write-Host " OK" -ForegroundColor Green
        
        # Check project structure
        $hasPackageJson = Test-Path (Join-Path $projectToTest "package.json")
        $hasTsConfig = Test-Path (Join-Path $projectToTest "tsconfig.json")
        $hasSrc = Test-Path (Join-Path $projectToTest "src")
        
        Write-Host "         package.json: $(if ($hasPackageJson) { '✓' } else { '✗' })" -ForegroundColor Gray
        Write-Host "         tsconfig.json: $(if ($hasTsConfig) { '✓' } else { '✗' })" -ForegroundColor Gray
        Write-Host "         src/: $(if ($hasSrc) { '✓' } else { '✗' })" -ForegroundColor Gray
    }
    else {
        Write-Host " NOT FOUND: $projectToTest" -ForegroundColor Red
        $allGood = $false
    }
}

# Test 7: Backup directory
Write-Host "[TEST 7] Checking backup directory..." -NoNewline
$backupDir = "C:\dev\_backups"
if (Test-Path $backupDir) {
    $backupCount = (Get-ChildItem $backupDir -Filter "*.zip").Count
    Write-Host " OK ($backupCount existing backups)" -ForegroundColor Green
}
else {
    Write-Host " Creating..." -NoNewline
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host " OK (created)" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ALL TESTS PASSED - Ready to run!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. .\init.ps1 -TargetProject 'C:\dev\apps\your-project'" -ForegroundColor Gray
    Write-Host "    2. .\sync.ps1 -DryRun   (preview without API)" -ForegroundColor Gray
    Write-Host "    3. .\sync.ps1           (single pass)" -ForegroundColor Gray
    Write-Host "    4. .\ralph.ps1          (infinite loop)" -ForegroundColor Gray
}
else {
    Write-Host "  SOME TESTS FAILED - Fix issues above first" -ForegroundColor Yellow
}
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
