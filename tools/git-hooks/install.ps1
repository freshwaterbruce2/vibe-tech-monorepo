# Install the protected-branch and commit-message hooks into .git/hooks/
# Run once per clone: .\tools\git-hooks\install.ps1

[CmdletBinding(SupportsShouldProcess = $true)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not available on PATH."
    exit 1
}

$preCommitSource = Join-Path $PSScriptRoot 'pre-commit'
$commitMsgSource = Join-Path $PSScriptRoot 'commit-msg'
$gitDir = git rev-parse --git-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not inside a git repository."
    exit 1
}

$hooksDir = Join-Path $gitDir 'hooks'
$preCommitDest = Join-Path $hooksDir 'pre-commit'
$commitMsgDest = Join-Path $hooksDir 'commit-msg'

foreach ($source in @($preCommitSource, $commitMsgSource)) {
    if (-not (Test-Path $source)) {
        Write-Error "Source hook not found: $source"
        exit 1
    }
}

# Ensure hooks directory exists (some clones strip it)
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

if ($PSCmdlet.ShouldProcess($hooksDir, 'Install Git hooks')) {
    Copy-Item -Path $preCommitSource -Destination $preCommitDest -Force
    Copy-Item -Path $commitMsgSource -Destination $commitMsgDest -Force
    Write-Host "Installed pre-commit hook -> $preCommitDest" -ForegroundColor Green
    Write-Host "Installed commit-msg hook -> $commitMsgDest" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify: try committing something on main -- should refuse." -ForegroundColor DarkGray
    Write-Host "Bypass (emergency only): git commit --no-verify" -ForegroundColor DarkGray
}
