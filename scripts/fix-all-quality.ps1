# fix-all-quality.ps1
# Whole-monorepo quality pass: lint + typecheck across Nx-affected projects.
# Skips build (Tauri/Rust crates handled separately).
# Outputs machine-readable logs to D:\logs\quality\ for downstream triage.

#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Base = 'HEAD~5',
    [switch]$Fix,
    [switch]$SkipTypecheck,
    [switch]$SkipLint,
    [int]$Parallel = 1
)

$ErrorActionPreference = 'Stop'
$repo = 'C:\dev'
$logDir = 'D:\logs\quality'
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

Set-Location $repo

if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}

$lintLog = Join-Path $logDir "lint_$timestamp.log"
$tcLog   = Join-Path $logDir "typecheck_$timestamp.log"
$summary = Join-Path $logDir "summary_$timestamp.txt"

# --- Nx Cloud lock guard ---------------------------------------------------
# The sandbox-environment runs can leave orphaned extract locks. Clear before run.
$nxCloudLock = 'C:\dev\.nx\cache\cloud\extract.lock'
if (Test-Path $nxCloudLock) {
    Write-Host "[pre] Clearing stale Nx Cloud extract.lock..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $nxCloudLock -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Warning "Could not remove $nxCloudLock : $_"
    }
}

# --- OOM guard ------------------------------------------------------------
# Node 8GB heap, Nx daemon off (daemon holds memory across runs).
$env:NODE_OPTIONS = '--max-old-space-size=8192'
$env:NX_DAEMON = 'false'

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " fix-all-quality.ps1 — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host " base=$Base  fix=$Fix  parallel=$Parallel" -ForegroundColor Cyan
Write-Host " logs: $logDir" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# --- Affected project list ------------------------------------------------
Write-Host "[1/3] Computing affected projects (base=$Base)..." -ForegroundColor Green
$affectedRaw = & pnpm exec nx show projects --affected --base=$Base 2>&1
$affected = $affectedRaw | Where-Object { $_ -and $_ -notmatch '^NX\b' -and $_ -notmatch 'Daemon' -and $_ -notmatch 'ExperimentalWarning' }
$count = ($affected | Measure-Object).Count
Write-Host ("   -> {0} affected projects" -f $count)
$affected | Out-File -FilePath (Join-Path $logDir "affected_$timestamp.txt") -Encoding utf8

if ($count -eq 0) {
    Write-Host "   Nothing affected. Exiting." -ForegroundColor Yellow
    exit 0
}

# --- Lint pass -----------------------------------------------------------
$lintExit = 0
if (-not $SkipLint) {
    $lintTarget = if ($Fix) { 'lint:fix' } else { 'lint' }
    Write-Host "[2/4] Running $lintTarget across $count projects..." -ForegroundColor Green
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & pnpm exec nx affected -t $lintTarget --base=$Base --parallel=$Parallel --output-style=static *>&1 | Tee-Object -FilePath $lintLog
    $lintExit = $LASTEXITCODE
    $sw.Stop()
    Write-Host ("   lint: exit={0}  elapsed={1:n1}s  log={2}" -f $lintExit, $sw.Elapsed.TotalSeconds, $lintLog)
} else {
    Write-Host "[2/4] Lint skipped." -ForegroundColor DarkGray
}

# --- Aggressive auto-fix post-pass (suggestion-tier fixers) --------------
# nx lint:fix invokes eslint --fix which only applies "problem"-type fixers.
# Many warnings (prefer-nullish-coalescing, prefer-optional-chain, etc.) are
# registered as "suggestion" fixers. Sweep them here.
$autoFixLog = Join-Path $logDir "autofix_$timestamp.log"
$autoFixExit = 0
if ($Fix -and -not $SkipLint) {
    Write-Host "[3/4] Aggressive auto-fix (--fix-type problem,suggestion,layout) across $count projects..." -ForegroundColor Green
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $eslintBin = Join-Path $repo 'node_modules\eslint\bin\eslint.js'
    if (-not (Test-Path $eslintBin)) {
        Write-Warning "ESLint binary not found at $eslintBin — skipping auto-fix pass."
        $autoFixExit = -1
    } else {
        # Resolve project src paths from affected list.
        $allProjects = & pnpm exec nx show projects 2>$null | Where-Object { $_ -and $_ -notmatch '^NX\b' -and $_ -notmatch 'Daemon' }
        $patterns = @()
        foreach ($p in $affected) {
            try {
                $cfg = & pnpm exec nx show project $p --json 2>$null | ConvertFrom-Json -ErrorAction Stop
                $root = $cfg.root
                if ($root) {
                    $srcPath = Join-Path $repo (Join-Path $root 'src')
                    if (Test-Path $srcPath) { $patterns += $srcPath }
                }
            } catch { }
        }
        if ($patterns.Count -gt 0) {
            "[autofix] targets ($($patterns.Count)):" | Out-File $autoFixLog -Encoding utf8
            $patterns | Out-File $autoFixLog -Append -Encoding utf8
            "" | Out-File $autoFixLog -Append -Encoding utf8
            & node --max-old-space-size=8192 $eslintBin $patterns `
                --fix `
                --fix-type 'problem,suggestion,layout' `
                --no-error-on-unmatched-pattern `
                --quiet `
                *>&1 | Tee-Object -FilePath $autoFixLog -Append
            $autoFixExit = $LASTEXITCODE
        } else {
            Write-Host "   no src/ paths resolved — nothing to auto-fix." -ForegroundColor DarkGray
        }
    }
    $sw.Stop()
    Write-Host ("   autofix: exit={0}  elapsed={1:n1}s  log={2}" -f $autoFixExit, $sw.Elapsed.TotalSeconds, $autoFixLog)
} else {
    Write-Host "[3/4] Aggressive auto-fix skipped." -ForegroundColor DarkGray
}

# --- Typecheck pass ------------------------------------------------------
$tcExit = 0
if (-not $SkipTypecheck) {
    Write-Host "[4/4] Running typecheck across $count projects..." -ForegroundColor Green
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & pnpm exec nx affected -t typecheck --base=$Base --parallel=$Parallel --output-style=static *>&1 | Tee-Object -FilePath $tcLog
    $tcExit = $LASTEXITCODE
    $sw.Stop()
    Write-Host ("   typecheck: exit={0}  elapsed={1:n1}s  log={2}" -f $tcExit, $sw.Elapsed.TotalSeconds, $tcLog)
} else {
    Write-Host "[4/4] Typecheck skipped." -ForegroundColor DarkGray
}

# --- Summary ------------------------------------------------------------
@"
fix-all-quality run $timestamp
base         = $Base
fix          = $Fix
parallel     = $Parallel
affected     = $count
lint exit    = $lintExit
autofix exit = $autoFixExit
typecheck exit = $tcExit
lint log     = $lintLog
autofix log  = $autoFixLog
typecheck log= $tcLog
"@ | Out-File -FilePath $summary -Encoding utf8

Write-Host ""
Write-Host "=== Summary ================================================" -ForegroundColor Cyan
Get-Content $summary
Write-Host "============================================================" -ForegroundColor Cyan

if ($lintExit -ne 0 -or $tcExit -ne 0) {
    Write-Host ""
    Write-Host "Non-zero exit. Next step: paste log paths to Claude for triage." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Clean. No errors across $count affected projects." -ForegroundColor Green
exit 0
