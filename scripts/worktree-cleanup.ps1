<#
.SYNOPSIS
  Safe pre-remove cleanup for a monorepo git worktree (project root).

.DESCRIPTION
  Stops root Docker Compose when present and removes worktree-local temp dirs.
  Does not touch node_modules, .nx cache, pnpm store, or D:\ durable data.

.PARAMETER DryRun
  Print actions without deleting or stopping containers.

.EXAMPLE
  pwsh -NoProfile -File scripts/worktree-cleanup.ps1
  pnpm worktree:cleanup
#>
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
$root = if ($PSScriptRoot) {
    (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
    (Get-Location).Path
}

Set-Location -LiteralPath $root
Write-Host "Worktree cleanup root: $root"

function Test-RootCompose {
    @(
        'docker-compose.yml',
        'docker-compose.yaml',
        'compose.yml',
        'compose.yaml'
    ) | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) } | Select-Object -First 1
}

function Stop-RootCompose {
    $composeFile = Test-RootCompose
    if (-not $composeFile) {
        Write-Host 'No root Compose file; skip docker compose down.'
        return
    }

    if ($DryRun) {
        Write-Host "[DryRun] docker compose -f $composeFile down --remove-orphans"
        return
    }

    Write-Host "Stopping Compose ($composeFile)..."
    docker compose -f $composeFile down --remove-orphans 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'docker compose down failed or docker unavailable (ignored).'
    }
}

function Remove-LocalTemp {
    param([string[]]$RelativePaths)

    foreach ($rel in $RelativePaths) {
        $path = Join-Path $root $rel
        if (-not (Test-Path -LiteralPath $path)) {
            Write-Host "Skip missing: $rel"
            continue
        }

        if ($DryRun) {
            Write-Host "[DryRun] Remove-Item -Recurse -Force $path"
            continue
        }

        try {
            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
            Write-Host "Removed: $rel"
        } catch {
            Write-Host "Failed to remove $rel : $($_.Exception.Message)"
        }
    }
}

Stop-RootCompose
# Worktree-local temps only — never node_modules, .nx, or D:\ paths
Remove-LocalTemp -RelativePaths @('.cache\tmp', '.cache', 'tmp')

Write-Host 'Worktree cleanup complete.'
if ($DryRun) {
    Write-Host '(DryRun — no changes applied)'
}
