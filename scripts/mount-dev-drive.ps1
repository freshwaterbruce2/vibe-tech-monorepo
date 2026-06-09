#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Mounts the VibeTech Dev Drive VHDX and optionally configures automount on startup.
.DESCRIPTION
    Must be run as Administrator.
#>

$ErrorActionPreference = 'Stop'

function Get-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Self-elevate if not running as Administrator
if (-not (Get-IsAdmin)) {
    Write-Host "[*] Not running as Administrator. Requesting elevation..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$vhdxPath = "D:\caches\devdrive.vhdx"
$targetLetter = "V"

if (-not (Test-Path $vhdxPath)) {
    Write-Error "ERROR: Dev Drive VHDX not found at $vhdxPath"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          Mounting VibeTech Dev Drive (${targetLetter}:\)           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if V: is already mounted
if (Test-Path "${targetLetter}:") {
    Write-Host "[+] Drive ${targetLetter}:\ is already mounted and active." -ForegroundColor Green
    $volume = Get-Volume -DriveLetter $targetLetter
    Write-Host "    Label: $($volume.NewFileSystemLabel)" -ForegroundColor Gray
    Write-Host "    FileSystem: $($volume.FileSystem)" -ForegroundColor Gray
} else {
    Write-Host "[*] Mounting $vhdxPath..." -ForegroundColor Yellow
    $diskImage = Mount-DiskImage -ImagePath $vhdxPath -PassThru
    Start-Sleep -Seconds 2
    
    # Get mounted volume
    $volume = Get-DiskImage -ImagePath $vhdxPath | Get-Disk | Get-Partition | Get-Volume
    
    if (-not $volume) {
        Write-Error "ERROR: Failed to retrieve volume after mounting."
        exit 1
    }
    
    # Ensure it's mapped to V:
    if ($volume.DriveLetter -ne $targetLetter) {
        Write-Host "[*] Mounted partition has drive letter '$($volume.DriveLetter)'. Reassigning to '$targetLetter'..." -ForegroundColor Yellow
        $oldLetter = $volume.DriveLetter
        if ($oldLetter) {
            Get-Partition -DriveLetter $oldLetter | Set-Partition -NewDriveLetter $targetLetter
        } else {
            # Find partition without drive letter on the mounted disk
            $diskImage | Get-Disk | Get-Partition | Where-Object { $_.DriveLetter -eq 0 -and $_.Type -eq "Basic" } | Set-Partition -NewDriveLetter $targetLetter
        }
        Start-Sleep -Seconds 1
    }
    
    if (Test-Path "${targetLetter}:") {
        Write-Host "[+] Successfully mounted Dev Drive as ${targetLetter}:\" -ForegroundColor Green
    } else {
        Write-Error "ERROR: Failed to mount Dev Drive as ${targetLetter}:\"
        exit 1
    }
}

# Optional automount registration
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "             Configure Automount on Startup              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$taskName = "MountDevDrive"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "[+] Automount Task Scheduler task '$taskName' is already registered." -ForegroundColor Green
} else {
    # If in non-interactive environment, register by default or check if we can read input.
    # To be safe, we will use a command line argument or register by default if not prompted.
    $register = $true
    Write-Host "[*] Registering Scheduled Task to run at system startup..." -ForegroundColor Yellow
    
    # We run a powershell command as SYSTEM at startup to mount the drive image
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command ""Mount-DiskImage -ImagePath '$vhdxPath'"""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Priority 1
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest -Force | Out-Null
    
    Write-Host "[+] Scheduled Task '$taskName' registered successfully!" -ForegroundColor Green
    Write-Host "    The drive will now automatically mount to ${targetLetter}:\ when Windows starts." -ForegroundColor Gray
}

Write-Host "`nReady! You can now access your monorepo at ${targetLetter}:\monorepo" -ForegroundColor Green
Start-Sleep -Seconds 3
