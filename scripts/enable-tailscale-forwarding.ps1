# Enable Windows IP forwarding so Tailscale subnet routing actually works.
# Sets IPEnableRouter=1 (global) + per-interface forwarding on Wi-Fi and
# Tailscale interfaces, then starts RemoteAccess service so the change takes
# effect without a reboot.

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== Enable IP Forwarding for Tailscale Subnet Routing ===' -ForegroundColor Cyan
Write-Host ''

# 1. Global IP forwarding (registry)
Write-Host '[1/4] Setting IPEnableRouter=1 in registry...' -ForegroundColor Cyan
$regPath = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters'
Set-ItemProperty -Path $regPath -Name 'IPEnableRouter' -Value 1 -Type DWord
$cur = (Get-ItemProperty -Path $regPath -Name IPEnableRouter).IPEnableRouter
Write-Host "  IPEnableRouter = $cur" -ForegroundColor Green

# 2. Per-interface forwarding (works without reboot)
Write-Host '[2/4] Enabling per-interface forwarding...' -ForegroundColor Cyan
$ifaces = Get-NetIPInterface -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -or $_.InterfaceAlias -like 'Tailscale*' }
foreach ($i in $ifaces) {
    Set-NetIPInterface -InterfaceIndex $i.ifIndex -Forwarding Enabled
    Write-Host "  Enabled on: $($i.InterfaceAlias)" -ForegroundColor Green
}

# 3. Start RemoteAccess service (engages global forwarding without reboot)
Write-Host '[3/4] Starting RemoteAccess service...' -ForegroundColor Cyan
$svc = Get-Service -Name RemoteAccess -ErrorAction SilentlyContinue
if ($svc) {
    Set-Service -Name RemoteAccess -StartupType Automatic
    if ($svc.Status -ne 'Running') {
        Start-Service -Name RemoteAccess -ErrorAction SilentlyContinue
    }
    $svc = Get-Service -Name RemoteAccess
    Write-Host "  RemoteAccess: $($svc.Status), StartupType: $($svc.StartType)" -ForegroundColor Green
} else {
    Write-Host '  RemoteAccess service not found - reboot required to apply IPEnableRouter.' -ForegroundColor Yellow
}

# 4. Verify
Write-Host '[4/4] Verifying...' -ForegroundColor Cyan
Get-NetIPInterface -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' -or $_.InterfaceAlias -like 'Tailscale*' } |
    Format-Table InterfaceAlias, Forwarding, ConnectionState

Write-Host ''
Write-Host '=== Done ===' -ForegroundColor Green
Write-Host '  IP forwarding is now active. Tailscale subnet routing should work immediately.'
Write-Host '  From your phone (off home WiFi, on cellular): try opening http://192.168.1.1 in a browser.'
Write-Host ''
Read-Host 'Press Enter to close'
