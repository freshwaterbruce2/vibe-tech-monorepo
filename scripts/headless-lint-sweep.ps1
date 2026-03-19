<#
.SYNOPSIS
    Run an unattended Claude Code lint sweep headlessly.

.DESCRIPTION
    Kicks off a Claude Code headless session that runs /loop:quality-sweep
    across all projects. Output is logged to D:\logs\headless-runs\.
    Safe to run overnight or in the background.

.PARAMETER Project
    Target a specific Nx project instead of all projects (optional).

.PARAMETER DryRun
    Print the command that would be run without executing it.

.EXAMPLE
    # Sweep all projects (overnight)
    .\headless-lint-sweep.ps1

    # Sweep one project
    .\headless-lint-sweep.ps1 -Project vibe-tutor

    # See what would run
    .\headless-lint-sweep.ps1 -DryRun
#>

param(
    [string]$Project = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Config ---
$LogDir    = "D:\logs\headless-runs"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile   = Join-Path $LogDir "lint-sweep-$Timestamp.log"
$WorkDir   = "C:\dev"

# --- Ensure log dir exists ---
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# --- Build the prompt ---
if ($Project) {
    $Prompt = "Run /fix-lint $Project — fix all lint and TypeScript errors. Follow the read-after-edit discipline. When done, commit the changes with a conventional commit message."
} else {
    $Prompt = "Run /loop:quality-sweep — process all Nx projects, fixing lint and TypeScript errors one project at a time. Follow the read-after-edit discipline in CLAUDE.md. Stop after 20 commits or if 3 consecutive pre-commit hooks fail."
}

# --- Build the claude command ---
# --print runs headlessly (non-interactive, exits when done)
# --allowedTools restricts what Claude can do for safety
$ClaudeArgs = @(
    "--print"
    "--allowedTools", "Bash(pnpm:*),Bash(pnpm nx:*),Bash(git add:*),Bash(git commit:*),Bash(git diff:*),Bash(git status:*),Bash(git log:*),Read,Edit,Glob,Grep"
    "--model", "claude-sonnet-4-6"
    $Prompt
)

$ClaudeCmd = "claude " + ($ClaudeArgs | ForEach-Object { if ($_ -match '\s') { """$_""" } else { $_ } }) -join " "

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Headless Lint Sweep"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Log : $LogFile"
if ($Project) {
    Write-Host "  Target  : $Project"
} else {
    Write-Host "  Target  : all projects"
}
Write-Host "  Started : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would execute:"
    Write-Host "  $ClaudeCmd"
    Write-Host ""
    Write-Host "  Working dir : $WorkDir"
    Write-Host "  Log file    : $LogFile"
    exit 0
}

# --- D:\ snapshot before starting ---
$SnapshotScript = "C:\dev\scripts\version-control\Save-Snapshot.ps1"
if (Test-Path $SnapshotScript) {
    Write-Host "[snapshot] Creating safety snapshot before sweep..."
    try {
        & $SnapshotScript -Description "Before headless lint sweep $Timestamp" 2>&1 | Out-Null
        Write-Host "[snapshot] Done."
    } catch {
        Write-Host "[snapshot] Warning: snapshot failed — continuing anyway. Error: $_"
    }
} else {
    Write-Host "[snapshot] Save-Snapshot.ps1 not found, skipping."
}

Write-Host ""
Write-Host "[sweep] Starting Claude headless session..."
Write-Host "[sweep] Output → $LogFile"
Write-Host "[sweep] Ctrl+C to abort."
Write-Host ""

# --- Run ---
$StartTime = Get-Date

Push-Location $WorkDir
try {
    $Header = @"
Headless Lint Sweep
Started : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Project : $(if ($Project) { $Project } else { 'all' })
Command : $ClaudeCmd
$(("=" * 60))

"@
    $Header | Out-File -FilePath $LogFile -Encoding utf8

    # Stream output to both console and log file
    & claude @ClaudeArgs 2>&1 | Tee-Object -FilePath $LogFile -Append

    $ExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

$Elapsed = (Get-Date) - $StartTime
$ElapsedStr = "{0:hh\:mm\:ss}" -f $Elapsed

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "  Sweep complete"
Write-Host "  Duration : $ElapsedStr"
Write-Host "  Exit code: $ExitCode"
Write-Host "  Log      : $LogFile"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Quick summary from log
$CommitCount = (Select-String -Path $LogFile -Pattern "auto-fix lint" -SimpleMatch).Count
if ($CommitCount -gt 0) {
    Write-Host "  Commits made: $CommitCount"
}
Write-Host ""

exit $ExitCode
