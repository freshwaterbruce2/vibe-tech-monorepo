# Install the protected-branch pre-commit hook into .git/hooks/
# Run once per clone: .\tools\git-hooks\install.ps1

[CmdletBinding(SupportsShouldProcess = $true)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot 'pre-commit'
$gitDir = git rev-parse --git-dir 2>$null
if (-not $gitDir) {
    Write-Error "Not inside a git repository."
    exit 1
}

$hooksDir = Join-Path $gitDir 'hooks'
$dest = Join-Path $hooksDir 'pre-commit'

if (-not (Test-Path $source)) {
    Write-Error "Source hook not found: $source"
    exit 1
}

# Ensure hooks directory exists (some clones strip it)
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

if ($PSCmdlet.ShouldProcess($dest, 'Install protected-branch pre-commit hook')) {
    Copy-Item -Path $source -Destination $dest -Force
    Write-Host "Installed pre-commit hook -> $dest" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify: try committing something on main -- should refuse." -ForegroundColor DarkGray
    Write-Host "Bypass (emergency only): git commit --no-verify" -ForegroundColor DarkGray
}
