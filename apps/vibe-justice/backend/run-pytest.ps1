#!/usr/bin/env pwsh
# Environment-agnostic pytest launcher for the vibe-justice backend.
#
# Resolves a usable Python interpreter, preferring the local virtualenv
# (.venv) but falling back to the system `python`/`py` so the Nx target runs
# both locally (developer .venv present) and in CI runners where the venv is
# never created (see .github/workflows/vibe-justice.yml backend job, which
# installs deps into the system interpreter via pip).
#
# Used by the `vibe-justice:test:backend` and `:test:backend:coverage` targets
# (apps/vibe-justice/project.json).
param(
    [switch]$Coverage
)

$ErrorActionPreference = 'Stop'

# Run from the backend root regardless of caller cwd so pytest discovery is stable.
Set-Location -LiteralPath $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot '.venv' 'Scripts' 'python.exe'
if (Test-Path -LiteralPath $venvPython) {
    $python = $venvPython
}
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $python = 'python'
}
elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $python = 'py'
}
else {
    Write-Error 'No Python interpreter found (.venv, python, or py on PATH).'
    exit 1
}

Write-Host "Using Python interpreter: $python"

if ($Coverage) {
    & $python -m pytest vibe_justice/tests -v `
        --cov=vibe_justice --cov-report=html:coverage --cov-report=term
}
else {
    & $python -m pytest vibe_justice/tests -v --tb=short
}

exit $LASTEXITCODE
