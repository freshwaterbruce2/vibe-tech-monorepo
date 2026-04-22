#!/usr/bin/env pwsh
# Build backend sidecar for Tauri
# This script builds the Python FastAPI backend into a standalone executable

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Building Vibe-Justice Backend Sidecar" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get absolute paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path (Join-Path $scriptDir "..") "backend" | Resolve-Path
$outputDir = Join-Path (Join-Path $scriptDir "src-tauri") "binaries"
$specFile = Join-Path $backendDir "backend-sidecar.spec"

Write-Host "Backend directory: $backendDir" -ForegroundColor Gray
Write-Host "Output directory: $outputDir" -ForegroundColor Gray
Write-Host "Spec file: $specFile`n" -ForegroundColor Gray

# Create output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "Created output directory" -ForegroundColor Green
}

# Navigate to backend directory
Set-Location $backendDir

# Check if backend/.venv exists first (standard location)
$backendVenvPath = Join-Path $backendDir ".venv"
if (-not (Test-Path $backendVenvPath)) {
    Write-Host "Creating Python virtual environment in backend/..." -ForegroundColor Yellow
    Set-Location $backendDir
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create virtual environment"
        exit 1
    }
    Write-Host "Virtual environment created" -ForegroundColor Green
}

# Ensure we are in the backend directory for pip and PyInstaller
Set-Location $backendDir

# Define Python executable path
$pythonExe = Join-Path $backendVenvPath "Scripts\python.exe"

# Usage info
Write-Host "Using Python: $pythonExe" -ForegroundColor Gray

# Install/upgrade dependencies
# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& $pythonExe -m pip install --quiet --upgrade pip
& $pythonExe -m pip install --quiet -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies"
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green

# Run PyInstaller
Write-Host "`nBuilding executable with PyInstaller..." -ForegroundColor Yellow
& $pythonExe -m PyInstaller $specFile --distpath $outputDir --noconfirm
if ($LASTEXITCODE -ne 0) {
    Write-Error "PyInstaller build failed"
    exit 1
}

# Check if backend.exe was created and rename for Tauri sidecar
$exePath = Join-Path $outputDir "backend.exe"
$targetTripleExe = Join-Path $outputDir "backend-x86_64-pc-windows-msvc.exe"

if (Test-Path $exePath) {
    # Rename/Copy to target triple name required by Tauri
    Copy-Item -Path $exePath -Destination $targetTripleExe -Force

    $exeSize = (Get-Item $targetTripleExe).Length / 1MB
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Backend build successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Executable: $targetTripleExe" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($exeSize, 2)) MB`n" -ForegroundColor Cyan
}
else {
    Write-Error "backend.exe was not created in $outputDir"
    exit 1
}
