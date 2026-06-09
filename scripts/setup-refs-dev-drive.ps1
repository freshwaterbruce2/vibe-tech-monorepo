#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automates the creation of a Windows 11 ReFS Dev Drive (V:\) and migrates the VibeTech monorepo workspace and pnpm cache.
.DESCRIPTION
    This script runs on Windows 11. It must be run from an elevated (Administrator) PowerShell session.
    It performs the following:
    1. Checks for Administrator elevation.
    2. Creates a Virtual Hard Disk (VHDX) file on the D:\ drive (e.g., D:\caches\devdrive.vhdx) with a custom size.
    3. Mounts and initializes the VHDX.
    4. Formats the volume as an ReFS Dev Drive (V:\) with performance mode enabled.
    5. Migrates the monorepo workspace from V:\monorepo to V:\monorepo, excluding node_modules, temp files, and caches to keep the process fast.
    6. Configures the pnpm store directory to V:\caches\pnpm.
#>

$ErrorActionPreference = 'Stop'

function Get-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 1. Elevation Check
if (-not (Get-IsAdmin)) {
    Write-Error "ERROR: This script must be run from an Elevated (Administrator) PowerShell window."
    Write-Host "Please right-click PowerShell / Terminal and select 'Run as Administrator'." -ForegroundColor Red
    exit 1
}

# Configure paths
$vhdxDir = "D:\caches"
$vhdxPath = Join-Path $vhdxDir "devdrive.vhdx"
$driveLetter = "V"
$refsVolumeLabel = "DevDrive"
$sizeGB = 64
$sourceWorkspace = "V:\monorepo"
$targetWorkspace = "V:\monorepo"
$pnpmStoreTarget = "V:\caches\pnpm"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Windows 11 ReFS Dev Drive & Workspace Migration Tool   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 2. Check if Dev Drive (V:) already exists
if (Test-Path -Path "${driveLetter}:") {
    Write-Host "[*] Drive ${driveLetter}:\ already exists." -ForegroundColor Yellow
    $volume = Get-Volume -DriveLetter $driveLetter -ErrorAction SilentlyContinue
    if ($volume -and $volume.FileSystem -eq "ReFS") {
        Write-Host "[+] Found existing ReFS volume on ${driveLetter}:\." -ForegroundColor Green
    } else {
        Write-Warning "Drive ${driveLetter}:\ exists but is not formatted as ReFS. FileSystem: $($volume.FileSystem)"
    }
} else {
    # 3. Create the VHDX file on D:\
    if (-not (Test-Path -Path $vhdxDir)) {
        New-Item -ItemType Directory -Force -Path $vhdxDir | Out-Null
    }

    if (Test-Path -Path $vhdxPath) {
        Write-Host "[*] Found existing VHDX file at $vhdxPath. Removing it to prevent DiskPart conflicts..." -ForegroundColor Yellow
        Remove-Item -Path $vhdxPath -Force
    }

    Write-Host "[1/4] Creating a ${sizeGB}GB Dynamic VHDX file at $vhdxPath using DiskPart..." -ForegroundColor Yellow
    # Create temporary diskpart script
    $diskpartScriptPath = [System.IO.Path]::GetTempFileName()
    $sizeMB = $sizeGB * 1024
    $diskpartScript = @"
create vdisk file="$vhdxPath" maximum=$sizeMB type=expandable
select vdisk file="$vhdxPath"
attach vdisk
create partition primary
assign letter=$driveLetter
"@
    $diskpartScript | Out-File -FilePath $diskpartScriptPath -Encoding ascii

    # Run diskpart
    Write-Host "[2/4] Initializing and mounting virtual hard disk..." -ForegroundColor Yellow
    $diskpartProcess = Start-Process diskpart -ArgumentList "/s `"$diskpartScriptPath`"" -Wait -NoNewWindow -PassThru
    Remove-Item -Path $diskpartScriptPath -ErrorAction SilentlyContinue

    if ($diskpartProcess.ExitCode -ne 0) {
        Write-Error "ERROR: DiskPart failed with exit code $($diskpartProcess.ExitCode)."
        exit 1
    }

    # Give Windows a few seconds to mount the volume and register the drive letter
    Start-Sleep -Seconds 5

    Write-Host "[3/4] Formatting partition as ReFS DevDrive..." -ForegroundColor Yellow
    # Format volume as Dev Drive (ReFS)
    # The -DevDrive switch optimizes performance and enables Defender Performance Mode
    $volume = Format-Volume -DriveLetter $driveLetter -DevDrive -FileSystem ReFS -NewFileSystemLabel $refsVolumeLabel -Confirm:$false -Force
    Write-Host "[+] Successfully formatted ReFS Dev Drive on V:\" -ForegroundColor Green
}

# 4. Create directories on V:
Write-Host "[4/4] Setting up workspace and pnpm cache directories on V:\" -ForegroundColor Yellow
$dirs = @($targetWorkspace, $pnpmStoreTarget)
foreach ($dir in $dirs) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}

# 5. Migrate workspace files
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   Migrating VibeTech Monorepo workspace to V:\monorepo   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (Test-Path -Path $sourceWorkspace) {
    Write-Host "[*] Source workspace found at $sourceWorkspace" -ForegroundColor Gray
    Write-Host "[*] Running robocopy to mirror files (excluding node_modules and caches)..." -ForegroundColor Yellow
    
    # Exclude directories that can be easily re-generated to save space and time during migration
    $excludeDirs = @("node_modules", ".nx", ".turbo", "dist", "build", "tmp", "playwright-report", ".venv", "_backups")
    
    $robocopyArgs = @(
        $sourceWorkspace,
        $targetWorkspace,
        "/MIR",                           # Mirror directory tree
        "/XD"                             # Exclude directories
    ) + $excludeDirs + @(
        "/R:3",                           # Retry 3 times on failed files
        "/W:5",                           # Wait 5 seconds between retries
        "/NP",                            # No progress indicator to keep logs clean
        "/NDL",                           # Do not log directory names
        "/NJH",                           # No Job Header
        "/NJS"                            # No Job Summary
    )
    
    # Run Robocopy
    $process = Start-Process robocopy -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru
    # Robocopy exit codes: 0-7 are successful/completed copies, 8+ indicate failures/mismatches
    if ($process.ExitCode -lt 8) {
        Write-Host "[+] Workspace migration successfully completed!" -ForegroundColor Green
    } else {
        Write-Warning "Robocopy completed with warnings/errors. ExitCode: $($process.ExitCode)"
    }
} else {
    Write-Error "ERROR: Source workspace '$sourceWorkspace' does not exist."
}

# 6. Configure pnpm cache store
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   Configuring pnpm Cache and Workspace Store Location    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Set global store path to the Dev Drive to enable hard-links on V:\
Write-Host "[*] Setting pnpm global store path to V:\caches\pnpm..." -ForegroundColor Yellow
pnpm config set store-dir "V:\caches\pnpm\v10" --global

# Set local store-dir if required
pnpm config set store-dir "V:\caches\pnpm\v10"

Write-Host "[+] pnpm store configuration updated." -ForegroundColor Green
Write-Host "    Current store directory path: $(pnpm store path)" -ForegroundColor Gray

# 7. Print Post-Migration Instructions
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   MIGRATION AND OPTIMIZATION SETUP COMPLETE!            " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Your Dev Drive has been initialized as V:\ (ReFS)."
Write-Host "Both the monorepo workspace and the pnpm global store now live on V:\"
Write-Host "This allows pnpm to use high-performance hard-linking on the same volume!"
Write-Host ""
Write-Host "To complete the transition, please follow these steps:"
Write-Host "1. Re-open your terminal or IDE inside: V:\monorepo"
Write-Host "2. Run 'pnpm install' from V:\monorepo to recreate node_modules using ReFS hard-links."
Write-Host "3. Run 'pnpm run typecheck' to verify all compilations pass successfully."
Write-Host "4. Update any environment variables or shortcuts pointing to V:\monorepo to V:\monorepo."
Write-Host "==========================================================" -ForegroundColor Green
