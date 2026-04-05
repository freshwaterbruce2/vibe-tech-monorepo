$ErrorActionPreference = 'Continue'
Set-Location C:\dev

. (Join-Path $PSScriptRoot 'Initialize-DevProcessEnvironment.ps1')
$null = Initialize-DevProcessEnvironment

Write-Host "`n--- BUILD ---"
pnpm nx run agent-engine:build

Write-Host "`n--- TYPECHECK ---"
pnpm nx run agent-engine:typecheck

Write-Host "`n--- LINT ---"
pnpm nx run agent-engine:lint

Write-Host "`n--- TEST ---"
pnpm nx run agent-engine:test

Write-Host "`n--- SELF-EVAL ---"
pnpm nx run agent-engine:self-eval

Write-Host "`n--- BENCHMARK ---"
pnpm nx run agent-engine:benchmark
