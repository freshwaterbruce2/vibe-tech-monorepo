# Setup-Desktop-SSH-Server.ps1
# Configures OpenSSH Server on Windows 11 Desktop for Remote Development

<#
.SYNOPSIS
    Enables and configures OpenSSH Server on Windows 11 desktop
.DESCRIPTION
    This script:
    - Verifies OpenSSH Server installation
    - Starts the SSH service
    - Configures auto-start on boot
    - Sets up firewall rules
    - Displays connection information for laptop
.NOTES
    Must be run as Administrator
#>

#Requires -RunAsAdministrator

Write-Host "=== Desktop SSH Server Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if OpenSSH Server is installed
Write-Host "[1/5] Checking OpenSSH Server installation..." -ForegroundColor Yellow
$sshServer = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'

if ($sshServer.State -eq "Installed") {
    Write-Host "  OpenSSH Server is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing OpenSSH Server..." -ForegroundColor Yellow
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "  OpenSSH Server installed successfully" -ForegroundColor Green
}

# Step 2: Start SSH service
Write-Host ""
Write-Host "[2/5] Starting SSH service..." -ForegroundColor Yellow
$service = Get-Service -Name sshd -ErrorAction SilentlyContinue

if ($service.Status -eq "Running") {
    Write-Host "  SSH service is already running" -ForegroundColor Green
} else {
    Start-Service sshd
    Write-Host "  SSH service started" -ForegroundColor Green
}

# Step 3: Configure auto-start
Write-Host ""
Write-Host "[3/5] Configuring auto-start..." -ForegroundColor Yellow
Set-Service -Name sshd -StartupType 'Automatic'
Write-Host "  SSH service set to start automatically on boot" -ForegroundColor Green

# Step 4: Configure firewall
Write-Host ""
Write-Host "[4/5] Configuring firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue

if ($firewallRule) {
    Write-Host "  Firewall rule already exists" -ForegroundColor Green
} else {
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "  Firewall rule created" -ForegroundColor Green
}

# Step 5: Display connection information
Write-Host ""
Write-Host "[5/5] Getting connection information..." -ForegroundColor Yellow
$hostname = hostname
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'}).IPAddress | Select-Object -First 1
$username = $env:USERNAME

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Desktop Connection Information:" -ForegroundColor Cyan
Write-Host "  Hostname:    $hostname" -ForegroundColor White
Write-Host "  IP Address:  $ipAddress" -ForegroundColor White
Write-Host "  Username:    $username" -ForegroundColor White
Write-Host "  SSH Port:    22" -ForegroundColor White
Write-Host ""
Write-Host "Use this on your laptop to connect:" -ForegroundColor Yellow
Write-Host "  ssh $username@$ipAddress" -ForegroundColor White
Write-Host ""
Write-Host "VS Code Remote SSH connection string:" -ForegroundColor Yellow
Write-Host "  $username@$ipAddress" -ForegroundColor White
Write-Host ""

# Test SSH service
Write-Host "Testing SSH service status..." -ForegroundColor Yellow
$serviceStatus = Get-Service -Name sshd
Write-Host "  Service Status: $($serviceStatus.Status)" -ForegroundColor $(if ($serviceStatus.Status -eq "Running") { "Green" } else { "Red" })
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run 'Setup-Laptop-SSH-Client.ps1' on your laptop" -ForegroundColor White
Write-Host "2. Install VS Code Remote-SSH extension on laptop" -ForegroundColor White
Write-Host "3. Connect using the connection string above" -ForegroundColor White
Write-Host ""
