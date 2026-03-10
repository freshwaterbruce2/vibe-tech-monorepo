# Setup-Laptop-SSH-Client.ps1
# Configures SSH client on Windows 11 Laptop for Remote Development

<#
.SYNOPSIS
    Sets up SSH client on Windows 11 laptop to connect to desktop
.DESCRIPTION
    This script:
    - Verifies OpenSSH Client installation
    - Generates SSH key pair if needed
    - Copies public key to desktop
    - Tests SSH connection
    - Installs VS Code Remote-SSH extension
.NOTES
    Run after Setup-Desktop-SSH-Server.ps1 on desktop
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$DesktopIP,

    [Parameter(Mandatory=$true)]
    [string]$DesktopUsername
)

Write-Host "=== Laptop SSH Client Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if OpenSSH Client is installed
Write-Host "[1/6] Checking OpenSSH Client installation..." -ForegroundColor Yellow
$sshClient = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'

if ($sshClient.State -eq "Installed") {
    Write-Host "  OpenSSH Client is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing OpenSSH Client..." -ForegroundColor Yellow
    try {
        Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
        Write-Host "  OpenSSH Client installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Error installing OpenSSH Client. Run as Administrator." -ForegroundColor Red
        exit 1
    }
}

# Step 2: Check for existing SSH key
Write-Host ""
Write-Host "[2/6] Checking SSH key..." -ForegroundColor Yellow
$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"

if (Test-Path $sshKeyPath) {
    Write-Host "  SSH key already exists" -ForegroundColor Green
} else {
    Write-Host "  Generating new SSH key..." -ForegroundColor Yellow
    $sshDir = "$env:USERPROFILE\.ssh"
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir | Out-Null
    }

    ssh-keygen -t ed25519 -f $sshKeyPath -N '""' -C "laptop-to-desktop"
    Write-Host "  SSH key generated" -ForegroundColor Green
}

# Step 3: Test basic SSH connection
Write-Host ""
Write-Host "[3/6] Testing SSH connection..." -ForegroundColor Yellow
Write-Host "  Attempting to connect to $DesktopUsername@$DesktopIP" -ForegroundColor White
Write-Host "  You may be prompted for password on first connection" -ForegroundColor White
Write-Host ""

$testConnection = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$DesktopUsername@$DesktopIP" "echo 'Connection successful'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Connection test passed" -ForegroundColor Green
} else {
    Write-Host "  Connection test failed" -ForegroundColor Red
    Write-Host "  Please verify:" -ForegroundColor Yellow
    Write-Host "    - Desktop IP address is correct: $DesktopIP" -ForegroundColor White
    Write-Host "    - Desktop username is correct: $DesktopUsername" -ForegroundColor White
    Write-Host "    - Desktop SSH service is running" -ForegroundColor White
    Write-Host "    - Firewall allows port 22" -ForegroundColor White
    exit 1
}

# Step 4: Copy SSH public key to desktop (for passwordless login)
Write-Host ""
Write-Host "[4/6] Setting up passwordless login..." -ForegroundColor Yellow
if (Test-Path "$sshKeyPath.pub") {
    $publicKey = Get-Content "$sshKeyPath.pub"
    Write-Host "  Copying public key to desktop..." -ForegroundColor White

    # Create .ssh directory on desktop and add public key
    $sshCommand = @"
mkdir -p ~/.ssh; echo '$publicKey' >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys
"@

    ssh "$DesktopUsername@$DesktopIP" $sshCommand

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Passwordless login configured" -ForegroundColor Green
    } else {
        Write-Host "  Warning: Could not configure passwordless login" -ForegroundColor Yellow
        Write-Host "  You'll need to enter password for each connection" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Warning: Public key not found" -ForegroundColor Yellow
}

# Step 5: Clone repository
Write-Host ""
Write-Host "[5/6] Setting up local Git repository..." -ForegroundColor Yellow
if (Test-Path "C:\dev\.git") {
    Write-Host "  Repository already exists at C:\dev" -ForegroundColor Green
} else {
    Write-Host "  Clone manually with:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/freshwaterbruce2/vibetech.git C:\dev" -ForegroundColor White
}

# Step 6: Check VS Code
Write-Host ""
Write-Host "[6/6] Checking VS Code..." -ForegroundColor Yellow
$vscodePath = Get-Command code -ErrorAction SilentlyContinue

if ($vscodePath) {
    Write-Host "  VS Code found" -ForegroundColor Green
    Write-Host "  Installing Remote-SSH extension..." -ForegroundColor Yellow
    code --install-extension ms-vscode-remote.remote-ssh
    Write-Host "  Extension installed" -ForegroundColor Green
} else {
    Write-Host "  VS Code not found. Install from: https://code.visualstudio.com/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Details:" -ForegroundColor Cyan
Write-Host "  Desktop IP:  $DesktopIP" -ForegroundColor White
Write-Host "  Username:    $DesktopUsername" -ForegroundColor White
Write-Host ""
Write-Host "To connect via SSH:" -ForegroundColor Yellow
Write-Host "  ssh $DesktopUsername@$DesktopIP" -ForegroundColor White
Write-Host ""
Write-Host "To connect via VS Code:" -ForegroundColor Yellow
Write-Host "  1. Open VS Code" -ForegroundColor White
Write-Host "  2. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "  3. Type 'Remote-SSH: Connect to Host'" -ForegroundColor White
Write-Host "  4. Enter: $DesktopUsername@$DesktopIP" -ForegroundColor White
Write-Host "  5. Select Windows as platform" -ForegroundColor White
Write-Host "  6. Open folder: C:\dev" -ForegroundColor White
Write-Host ""
