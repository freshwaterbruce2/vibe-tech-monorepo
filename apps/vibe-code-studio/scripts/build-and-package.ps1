param(
    [switch]$RequireSigning
)

$ErrorActionPreference = 'Stop'

function Test-TruthyValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return $Value -match '^(?i:true|1|yes|on)$'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $projectRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'Get-CargoTargetDir.ps1')
$cargoTargetDir = Get-CargoTargetDir -ProjectRoot $projectRoot
$bundleRoot = Join-Path $cargoTargetDir 'release\bundle'
$signingReadinessScript = Join-Path $PSScriptRoot 'check-windows-signing-readiness.ps1'
$requireSigningEffective = $RequireSigning -or (Test-TruthyValue -Value $env:VCS_REQUIRE_WINDOWS_SIGNING)
$buildLog = Join-Path $projectRoot ("build-log-{0}.txt" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

Start-Transcript -Path $buildLog

Write-Host 'Vibe Code Studio - Windows package build' -ForegroundColor Cyan
Write-Host "Workspace root: $workspaceRoot" -ForegroundColor Yellow
Write-Host "Project root:   $projectRoot" -ForegroundColor Yellow
Write-Host "Cargo target:   $cargoTargetDir" -ForegroundColor Yellow
Write-Host "Bundle output:  $bundleRoot" -ForegroundColor Yellow
Write-Host ''

try {
    Set-Location $workspaceRoot

    Write-Host '[1/6] Check Windows signing readiness' -ForegroundColor Green
    if (-not (Test-Path $signingReadinessScript)) {
        throw "Signing readiness script not found: $signingReadinessScript"
    }

    $signingArgs = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $signingReadinessScript,
        '-ProjectRoot', $projectRoot
    )
    if ($requireSigningEffective) {
        $signingArgs += '-RequireSigning'
    }

    & powershell @signingArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Windows signing readiness check failed with exit code $LASTEXITCODE"
    }

    Write-Host '[2/6] Typecheck' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:typecheck

    Write-Host '[3/6] Lint' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:lint

    Write-Host '[4/6] Test' -ForegroundColor Green
    pnpm exec vitest run --config apps/vibe-code-studio/vitest.config.ts

    Write-Host '[5/6] Build renderer' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:build

    Write-Host '[6/6] Build Tauri package' -ForegroundColor Green
    pnpm exec nx run vibe-code-studio:package

    if (-not (Test-Path $bundleRoot)) {
        throw "Bundle output directory not found: $bundleRoot"
    }

    $artifactNamePattern = '(?i)vibe[ -]?code[ -]?studio'
    $artifacts = Get-ChildItem -Path $bundleRoot -Recurse -File |
        Where-Object { $_.Extension -in @('.exe', '.msi', '.msix', '.zip') -and $_.Name -match $artifactNamePattern }

    if (-not $artifacts) {
        throw "No Vibe Code Studio installer artifacts found under $bundleRoot"
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
