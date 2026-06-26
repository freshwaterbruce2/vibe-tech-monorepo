#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated production verification for the Tauri desktop build.

.DESCRIPTION
    Verifies the current Windows build by checking the renderer output,
    Tauri installer artifacts, and a launchable desktop executable.

.PARAMETER SkipTests
    Skip running validation targets after the launch smoke test.

.PARAMETER SkipBuild
    Skip rebuilding the project before verification.

.PARAMETER SkipMsiSmoke
    Skip the MSI install/uninstall smoke test.

.PARAMETER RequireSigning
    Require Windows signing readiness to pass.
#>

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$SkipMsiSmoke,
    [switch]$RequireSigning
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Test-TruthyValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    return $Value -match '^(?i:true|1|yes|on)$'
}

Write-Host '==================================' -ForegroundColor Cyan
Write-Host ' Production Build Verification' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''

$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $projectRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'Get-CargoTargetDir.ps1')
$cargoTargetDir = Get-CargoTargetDir -ProjectRoot $projectRoot
$distPath = Join-Path $projectRoot 'dist'
$bundlePath = Join-Path $cargoTargetDir 'release\bundle'
$signingReadinessScript = Join-Path $PSScriptRoot 'check-windows-signing-readiness.ps1'
$msiSmokeScript = Join-Path $PSScriptRoot 'smoke-msi-installer.ps1'
$requireSigningEffective = $RequireSigning -or (Test-TruthyValue -Value $env:VCS_REQUIRE_WINDOWS_SIGNING)
$skipMsiSmokeEffective = $SkipMsiSmoke -or (Test-TruthyValue -Value $env:VCS_SKIP_MSI_SMOKE)
$installedExeCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Vibe Code Studio\vibe-code-studio.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\vibe-code-studio\Vibe Code Studio.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Vibe Code Studio\Vibe Code Studio.exe')
)
$releaseExeCandidates = @(
    (Join-Path $cargoTargetDir 'release\vibe-code-studio.exe'),
    (Join-Path $cargoTargetDir 'release\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\vibe-code-studio.exe')
)
$exeCandidates = @($releaseExeCandidates + $installedExeCandidates)

Write-Host "Workspace root: $workspaceRoot" -ForegroundColor DarkGray
Write-Host "Project root:   $projectRoot" -ForegroundColor DarkGray
Write-Host "Cargo target:   $cargoTargetDir" -ForegroundColor DarkGray
Write-Host "Bundle path:    $bundlePath" -ForegroundColor DarkGray
Write-Host ''

if (-not $SkipBuild) {
    Write-Host '[1/7] Building production version...' -ForegroundColor Yellow
    Set-Location $workspaceRoot
    pnpm exec nx run vibe-code-studio:build
    pnpm exec nx run vibe-code-studio:package
    Write-Host '✅ Build successful' -ForegroundColor Green
    Write-Host ''
} else {
    Write-Host '[1/7] Skipping build (--SkipBuild specified)' -ForegroundColor Yellow
    Write-Host ''
}

Write-Host '[2/7] Verifying build outputs...' -ForegroundColor Yellow
$checks = @(
    @{ Path = $distPath; Name = 'Renderer dist' },
    @{ Path = (Join-Path $distPath 'index.html'); Name = 'index.html' },
    @{ Path = $bundlePath; Name = 'Tauri bundle directory' }
)

$allPassed = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✅ $($check.Name): $($check.Path)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Name) missing: $($check.Path)" -ForegroundColor Red
        $allPassed = $false
    }
}

if (-not $allPassed) {
    Write-Host '❌ Build output verification failed' -ForegroundColor Red
    exit 1
}
Write-Host ''

Write-Host '[3/7] Verifying installer artifacts...' -ForegroundColor Yellow
$artifactNamePattern = '(?i)vibe[ -]?code[ -]?studio'
$installers = @()
if (Test-Path $bundlePath) {
    $installers = Get-ChildItem -Path $bundlePath -Recurse -File |
        Where-Object { $_.Extension -in @('.exe', '.msi', '.msix', '.zip') -and $_.Name -match $artifactNamePattern }
}

if (-not $installers) {
    Write-Host "  ❌ No Vibe Code Studio installer artifacts found under $bundlePath" -ForegroundColor Red
    exit 1
}

foreach ($installer in $installers) {
    Write-Host "  ✅ $($installer.FullName)" -ForegroundColor Green
}
Write-Host ''

Write-Host '[4/7] Checking Windows signing readiness...' -ForegroundColor Yellow
if (-not (Test-Path $signingReadinessScript)) {
    Write-Host "  ❌ Signing readiness script missing: $signingReadinessScript" -ForegroundColor Red
    exit 1
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
    Write-Host '  ❌ Windows signing readiness check failed' -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host ''

Write-Host '[5/7] Running MSI install/uninstall smoke...' -ForegroundColor Yellow
$msiArtifacts = @($installers | Where-Object { $_.Extension -ieq '.msi' })
if ($skipMsiSmokeEffective) {
    Write-Host '  ⚠️ MSI smoke skipped (--SkipMsiSmoke or VCS_SKIP_MSI_SMOKE)' -ForegroundColor Yellow
} elseif (-not $msiArtifacts) {
    Write-Host "  ❌ No MSI artifact found under $bundlePath. Expected at least one .msi for smoke testing." -ForegroundColor Red
    exit 1
} else {
    if (-not (Test-Path $msiSmokeScript)) {
        Write-Host "  ❌ MSI smoke script missing: $msiSmokeScript" -ForegroundColor Red
        exit 1
    }

    $latestMsi = $msiArtifacts | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $msiSmokeArgs = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $msiSmokeScript,
        '-ProjectRoot', $projectRoot,
        '-MsiPath', $latestMsi.FullName
    )

    & powershell @msiSmokeArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  ❌ MSI smoke test failed' -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
Write-Host ''

Write-Host '[6/7] Testing application launch...' -ForegroundColor Yellow
$exePath = $exeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $exePath) {
    Write-Host '  ❌ No desktop executable found. Checked:' -ForegroundColor Red
    $exeCandidates | ForEach-Object { Write-Host "     $_" -ForegroundColor Red }
    exit 1
}

$process = Start-Process -FilePath $exePath -PassThru
Start-Sleep -Seconds 5

if ($process.HasExited) {
    Write-Host "  ❌ Application exited immediately with code $($process.ExitCode)" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Application launched successfully from $exePath" -ForegroundColor Green
$process | Stop-Process -Force
Write-Host '  ✅ Application stopped cleanly' -ForegroundColor Green
Write-Host ''

if (-not $SkipTests) {
    Write-Host '[7/7] Running automated tests...' -ForegroundColor Yellow
    Set-Location $workspaceRoot
    pnpm exec nx run vibe-code-studio:typecheck
    pnpm exec nx run vibe-code-studio:lint
    pnpm exec vitest run --config apps/vibe-code-studio/vitest.config.ts
    Write-Host '✅ All tests passed' -ForegroundColor Green
} else {
    Write-Host '[7/7] Skipping tests (--SkipTests specified)' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ' ✅ Verification Complete' -ForegroundColor Green
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Production build is ready for distribution.' -ForegroundColor Green
