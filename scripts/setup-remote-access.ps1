# Remote Access Setup - Phase 1.3 (admin steps)
# Configures OpenSSH Server for inbound SSH over Tailscale.

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host "[1/4] Starting sshd service..." -ForegroundColor Cyan
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
Get-Service sshd | Format-Table Name, Status, StartType

Write-Host "[2/4] Adding firewall rule for SSH (port 22)..." -ForegroundColor Cyan
$existing = Get-NetFirewallRule -Name 'sshd' -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Firewall rule 'sshd' already exists, skipping."
} else {
    New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    Write-Host "  Created."
}

Write-Host "[3/4] Setting PowerShell as default SSH shell..." -ForegroundColor Cyan
$pwshPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell `
    -Value $pwshPath -PropertyType String -Force | Out-Null
Write-Host "  Default shell -> $pwshPath"

Write-Host "[4/4] Verifying SSH listener..." -ForegroundColor Cyan
$listener = Get-NetTCPConnection -LocalPort 22 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq 'Listen' }
if ($listener) {
    Write-Host "  sshd is listening on port 22" -ForegroundColor Green
} else {
    Write-Host "  WARNING: nothing listening on port 22 yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SSH setup complete ===" -ForegroundColor Green
Write-Host "Username for SSH:  $env:USERNAME"
Write-Host "Hostname:          $env:COMPUTERNAME"
Write-Host ""
Write-Host "Next: install Tailscale from https://tailscale.com/download/windows"
Write-Host "After Tailscale install, run:  tailscale up --unattended"
Write-Host ""
Read-Host "Press Enter to close"
