# Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       VIBETECH SYSTEM ONBOARDING & INITIALIZATION " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Drive Validation & Directory Provisioning
$RequiredDirectories = @(
    "D:\databases",
    "D:\logs",
    "D:\logs\self-healing",
    "D:\learning-system",
    "D:\learning-system\sessions"
)

Write-Host "[1/6] Verifying disk drive layouts and directories..." -ForegroundColor Yellow
if (-not (Test-Path "D:\")) {
    Write-Error "D: drive is missing! VibeTech monorepo requires a D: drive for databases and learning systems."
}

foreach ($Dir in $RequiredDirectories) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir | Out-Null
        Write-Host "  [+] Created: $Dir" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Verified: $Dir" -ForegroundColor Gray
    }
}

# 2. Enforcing Toolchain Versions via Corepack
Write-Host "`n[2/6] Activating Node Corepack and pnpm..." -ForegroundColor Yellow
try {
    corepack enable
    corepack prepare pnpm@10.33.0 --activate
    Write-Host "  [OK] Activated pnpm@10.33.0 successfully." -ForegroundColor Green
} catch {
    Write-Warning "Corepack activation failed. Ensuring pnpm is globally reachable..."
    & pnpm -v | Out-Null
}

# 3. Resolving Cross-Drive Hard-Link Penalty
Write-Host "`n[3/6] Configuring pnpm Store Location to prevent cross-drive penalties..." -ForegroundColor Yellow
$LocalStoreDir = "C:\.pnpm-store"
if (-not (Test-Path $LocalStoreDir)) {
    New-Item -ItemType Directory -Path $LocalStoreDir | Out-Null
}

# Override store-dir globally/locally for this user to keep files on the same volume (C:)
pnpm config set store-dir $LocalStoreDir
Write-Host "  [OK] pnpm store-dir set to: $LocalStoreDir (Volume C: -> Hard-linking enabled)" -ForegroundColor Green

# 4. Injecting Node Memory Limits (NODE_OPTIONS)
Write-Host "`n[4/6] Setting environment variable NODE_OPTIONS for memory limits..." -ForegroundColor Yellow
$NodeMemoryLimit = "--max-old-space-size=4096"

# Apply to the active process session
$env:NODE_OPTIONS = $NodeMemoryLimit

# Persist to User environment variables (no admin needed)
[System.Environment]::SetEnvironmentVariable("NODE_OPTIONS", $NodeMemoryLimit, [System.EnvironmentVariableTarget]::User)
Write-Host "  [OK] Persistent NODE_OPTIONS set to '$NodeMemoryLimit' in User variables." -ForegroundColor Green

# 5. Installing Workspace Dependencies
Write-Host "`n[5/6] Running workspace-wide installation..." -ForegroundColor Yellow
if (Test-Path ".\scripts\Initialize-DevProcessEnvironment.ps1") {
    . .\scripts\Initialize-DevProcessEnvironment.ps1
    Initialize-DevProcessEnvironment | Out-Null
}

pnpm install --frozen-lockfile
Write-Host "  [OK] Node dependencies successfully installed." -ForegroundColor Green

# 6. Bootstrapping Shared Database
Write-Host "`n[6/6] Bootstrapping databases and memory sync models..." -ForegroundColor Yellow
$InitDbScript = ".\scripts\Initialize-LearningDatabase.ps1"
if (Test-Path $InitDbScript) {
    . $InitDbScript
    Write-Host "  [OK] Database structure initialized successfully." -ForegroundColor Green
} else {
    Write-Warning "Initialize-LearningDatabase.ps1 not found. Skipping DB bootstrap."
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "   ONBOARDING COMPLETE - SYSTEM READY FOR DEV" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
