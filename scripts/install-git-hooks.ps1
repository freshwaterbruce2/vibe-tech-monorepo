# Installs the repo's pre-commit hook into .git/hooks/pre-commit.
#
# Idempotent; safe to run on every `pnpm install` via the root "prepare" script.
# This exists because .git/hooks is NOT tracked by git, so the hook is lost on a
# fresh clone (which is how it went missing after the 2026-06-17 re-clone).
# No-ops cleanly when there is no .git directory (e.g. CI tarball installs) and
# never throws a non-zero exit, so it can never break `pnpm install`.

$ErrorActionPreference = 'Stop'

try {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $gitDir = Join-Path $repoRoot '.git'

    if (-not (Test-Path -LiteralPath $gitDir)) {
        Write-Host 'install-git-hooks: no .git directory found; skipping.' -ForegroundColor DarkGray
        exit 0
    }

    # Honor a configured core.hooksPath; otherwise use the default .git/hooks.
    $hooksDir = git -C $repoRoot config --get core.hooksPath 2>$null
    if (-not $hooksDir) {
        $hooksDir = Join-Path $gitDir 'hooks'
    } elseif (-not [System.IO.Path]::IsPathRooted($hooksDir)) {
        $hooksDir = Join-Path $repoRoot $hooksDir
    }

    if (-not (Test-Path -LiteralPath $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }

    $hookPath = Join-Path $hooksDir 'pre-commit'

    # Written as an sh script (git runs hooks via its bundled shell, even on
    # Windows). LF line endings are required for the shebang to work.
    $hookBody = @(
        '#!/bin/sh',
        '# Auto-installed by scripts/install-git-hooks.ps1 - do not edit by hand.',
        '# Runs the tracked PowerShell quality gates against staged files.',
        'exec pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/pre-commit.ps1"',
        ''
    ) -join "`n"

    [System.IO.File]::WriteAllText($hookPath, $hookBody)
    Write-Host "install-git-hooks: pre-commit hook installed at $hookPath" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "install-git-hooks: skipped ($($_.Exception.Message))" -ForegroundColor Yellow
    exit 0
}
