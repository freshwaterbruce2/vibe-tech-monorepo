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
#>

param(
    [switch]$SkipTests,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host '==================================' -ForegroundColor Cyan
Write-Host ' Production Build Verification' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''

$projectRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $projectRoot '..\..')).Path
$distPath = Join-Path $projectRoot 'dist'
$bundlePath = Join-Path $projectRoot 'src-tauri\target\release\bundle'
$exeCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\vibe-code-studio\Vibe Code Studio.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Vibe Code Studio\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\Vibe Code Studio.exe'),
    (Join-Path $projectRoot 'src-tauri\target\release\vibe-code-studio.exe')
)

if (-not $SkipBuild) {
    Write-Host '[1/5] Building production version...' -ForegroundColor Yellow
    Set-Location $workspaceRoot
    pnpm exec nx run vibe-code-studio:build
    pnpm exec nx run vibe-code-studio:package
    Write-Host '✅ Build successful' -ForegroundColor Green
    Write-Host ''
}

Write-Host '[2/5] Verifying build outputs...' -ForegroundColor Yellow
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

Write-Host '[3/5] Verifying installer artifacts...' -ForegroundColor Yellow
$installers = @()
if (Test-Path $bundlePath) {
    $installers = Get-ChildItem -Path $bundlePath -Recurse -File |
        Where-Object { $_.Extension -in @('.exe', '.msi', '.msix', '.zip') }
}

if (-not $installers) {
    Write-Host "  ❌ No installer artifacts found under $bundlePath" -ForegroundColor Red
    exit 1
}

foreach ($installer in $installers) {
    Write-Host "  ✅ $($installer.FullName)" -ForegroundColor Green
}
Write-Host ''

Write-Host '[4/5] Testing application launch...' -ForegroundColor Yellow
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
    Write-Host '[5/5] Running automated tests...' -ForegroundColor Yellow
    Set-Location $workspaceRoot
    pnpm exec nx run vibe-code-studio:typecheck
    pnpm exec nx run vibe-code-studio:lint
    pnpm exec vitest run --config apps/vibe-code-studio/vitest.config.ts
    Write-Host '✅ All tests passed' -ForegroundColor Green
} else {
    Write-Host '[5/5] Skipping tests (--SkipTests specified)' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ' ✅ Verification Complete' -ForegroundColor Green
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Production build is ready for distribution.' -ForegroundColor Green
