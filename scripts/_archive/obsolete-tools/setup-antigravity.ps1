<#
.SYNOPSIS
    Sets up the "Antigravity" development environment structure.
.DESCRIPTION
    Enforces the C:\dev (Code) and D:\antigravity (Data) separation.
    Creates necessary directories, sets environment variables, and checks tool configurations.
#>

$ErrorActionPreference = "Stop"

Write-Host "🪐 Initializing Project Antigravity..." -ForegroundColor Cyan

# 1. Path Definitions
$CodeRoot = "C:\dev"
$DataDrive = "D:"
$AntigravityRoot = "$DataDrive\antigravity"
$Dirs = @(
    "$AntigravityRoot",
    "$AntigravityRoot\data",
    "$AntigravityRoot\logs",
    "$AntigravityRoot\cache",
    "$AntigravityRoot\backups",
    "$AntigravityRoot\secrets"
)

# 2. Verify Drives
if (-not (Test-Path $CodeRoot)) {
    Write-Error "CRITICAL: Code root $CodeRoot does not exist."
}
if (-not (Test-Path $DataDrive)) {
    Write-Error "CRITICAL: Data drive $DataDrive is missing."
}

# 3. Create Directory Structure
Write-Host "Checking Data Directory Structure on $DataDrive..." -ForegroundColor Yellow
foreach ($dir in $Dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  [+] Created $dir" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $dir exists" -ForegroundColor Gray
    }
}

# 4. Set Environment Variables (User Level)
Write-Host "Configuring Environment Variables..." -ForegroundColor Yellow
$EnvVars = @{
    "ANTIGRAVITY_ROOT"    = $CodeRoot
    "ANTIGRAVITY_DATA"    = "$AntigravityRoot\data"
    "ANTIGRAVITY_LOGS"    = "$AntigravityRoot\logs"
    "ANTIGRAVITY_BACKUPS" = "$AntigravityRoot\backups"
}

foreach ($key in $EnvVars.Keys) {
    $current = [Environment]::GetEnvironmentVariable($key, "User")
    $target = $EnvVars[$key]
    
    if ($current -ne $target) {
        [Environment]::SetEnvironmentVariable($key, $target, "User")
        Write-Host "  [+] Set $key = $target" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $key is set" -ForegroundColor Gray
    }
}

# 5. Tooling Checks
Write-Host "Verifying Tooling Configuration..." -ForegroundColor Yellow

# Git
if (Test-Path "$CodeRoot\.git") {
    Write-Host "  [OK] Git repository detected" -ForegroundColor Gray
} else {
    Write-Warning "  [!] Not a git repository"
}

# PNPM
if (Test-Path "$CodeRoot\pnpm-workspace.yaml") {
    Write-Host "  [OK] PNPM Workspace configured" -ForegroundColor Gray
} else {
    Write-Warning "  [!] Missing pnpm-workspace.yaml"
}

# Turbo
if (Test-Path "$CodeRoot\turbo.json") {
    Write-Host "  [OK] TurboRepo configured" -ForegroundColor Gray
} else {
    Write-Warning "  [!] Missing turbo.json"
}

Write-Host "`n🪐 Antigravity Setup Complete. Restart your terminal/IDE to load new environment variables." -ForegroundColor Cyan
