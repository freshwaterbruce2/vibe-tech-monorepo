$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $projectRoot '..\..')).Path
$bundleRoot = Join-Path $projectRoot 'src-tauri\target\release\bundle'
$buildLog = Join-Path $projectRoot ("build-log-{0}.txt" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

Start-Transcript -Path $buildLog

Write-Host 'Vibe Code Studio - Windows package build' -ForegroundColor Cyan
Write-Host "Workspace root: $workspaceRoot" -ForegroundColor Yellow
Write-Host "Project root:   $projectRoot" -ForegroundColor Yellow
Write-Host "Bundle output:  $bundleRoot" -ForegroundColor Yellow
Write-Host ''

try {
    Set-Location $workspaceRoot

    Write-Host '[1/5] Typecheck' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:typecheck

    Write-Host '[2/5] Lint' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:lint

    Write-Host '[3/5] Test' -ForegroundColor Green
    pnpm exec vitest run --config apps/vibe-code-studio/vitest.config.ts

    Write-Host '[4/5] Build renderer' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:build

    Write-Host '[5/5] Build Tauri package' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:package

    if (-not (Test-Path $bundleRoot)) {
        throw "Bundle output directory not found: $bundleRoot"
    }

    $artifacts = Get-ChildItem -Path $bundleRoot -Recurse -File |
        Where-Object { $_.Extension -in @('.exe', '.msi', '.msix', '.zip') }

    if (-not $artifacts) {
        throw "No Windows installer artifacts found under $bundleRoot"
    }

    Write-Host ''
    Write-Host 'Artifacts:' -ForegroundColor Green
    foreach ($artifact in $artifacts) {
        $size = '{0:N2} MB' -f ($artifact.Length / 1MB)
        Write-Host "  $($artifact.FullName) ($size)" -ForegroundColor Cyan
    }
}
finally {
    Stop-Transcript
}
