# Finish RustDesk setup after install + service registration succeeded.
# Skips the broken --password CLI (RustDesk 1.4.6 issue #8486) - user sets
# password from the GUI. Writes Direct IP config, firewall rule, restarts.

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$rdExe = 'C:\Program Files\RustDesk\rustdesk.exe'
$tsExe = 'C:\Program Files\Tailscale\tailscale.exe'

Write-Host ''
Write-Host '=== RustDesk Finish (post-install config) ===' -ForegroundColor Cyan
Write-Host ''

# --- 1. Kill any stuck rustdesk processes from the prior hang ----------------
Write-Host '[1/5] Clearing stuck RustDesk processes...' -ForegroundColor Cyan
Get-Process -Name rustdesk -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Stopping pid $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 3

# --- 2. Write Direct IP Access config to BOTH toml locations -----------------
Write-Host '[2/5] Writing Direct IP Access config...' -ForegroundColor Cyan

$desired = [ordered]@{
    'direct-server'        = "'Y'"
    'direct-access-port'   = "'21118'"
    'enable-lan-discovery' = "'N'"
}

function Update-RustDeskToml {
    param([string]$Path)
    $dir = Split-Path -Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $body = if (Test-Path $Path) { Get-Content -Path $Path -Raw } else { '' }
    if (-not $body) { $body = '' }
    if ($body -notmatch '(?m)^\s*\[options\]') {
        if ($body -and -not $body.EndsWith("`n")) { $body += "`r`n" }
        $body += "[options]`r`n"
    }
    foreach ($k in $desired.Keys) {
        $kEsc = [regex]::Escape($k)
        $line = "$k = $($desired[$k])"
        if ($body -match "(?m)^\s*$kEsc\s*=.*$") {
            $body = [regex]::Replace($body, "(?m)^\s*$kEsc\s*=.*$", $line)
        } else {
            $body = $body -replace '(?m)^\s*\[options\]\s*$', "[options]`r`n$line"
        }
    }
    Set-Content -Path $Path -Value $body -Encoding UTF8
    Write-Host "  Wrote $Path" -ForegroundColor Green
}

$svcCfg  = 'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml'
$userCfg = Join-Path $env:APPDATA 'RustDesk\config\RustDesk2.toml'
Update-RustDeskToml -Path $svcCfg
Update-RustDeskToml -Path $userCfg

# --- 3. Restart service ------------------------------------------------------
Write-Host '[3/5] Restarting service...' -ForegroundColor Cyan
$svc = Get-Service -Name RustDesk -ErrorAction SilentlyContinue
if ($svc) {
    Set-Service -Name RustDesk -StartupType Automatic
    Restart-Service -Name RustDesk -Force
    Start-Sleep -Seconds 8
    $svc = Get-Service -Name RustDesk
    Write-Host "  Service: $($svc.Status), StartupType: $($svc.StartType)" -ForegroundColor Green
} else {
    Write-Host '  WARNING: RustDesk service not found.' -ForegroundColor Yellow
}

# --- 4. Firewall rule (TCP 21118, Tailscale CGNAT only) ----------------------
Write-Host '[4/5] Adding firewall rule (TCP 21118, Tailscale only)...' -ForegroundColor Cyan
$ruleName = 'RustDesk-DirectIP-Tailscale'
if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
    Remove-NetFirewallRule -Name $ruleName
}
New-NetFirewallRule -Name $ruleName `
    -DisplayName 'RustDesk Direct IP (Tailscale only)' `
    -Direction Inbound -Protocol TCP -LocalPort 21118 `
    -RemoteAddress 100.64.0.0/10 `
    -Action Allow -Profile Any -Enabled True | Out-Null
Write-Host '  Inbound TCP 21118 allowed only from 100.64.0.0/10 (Tailscale).' -ForegroundColor Green

# --- 5. Verify + report ------------------------------------------------------
Write-Host '[5/5] Verifying...' -ForegroundColor Cyan
$listen = Get-NetTCPConnection -LocalPort 21118 -State Listen -ErrorAction SilentlyContinue
if ($listen) {
    Write-Host '  Port 21118 is LISTENING.' -ForegroundColor Green
    $listen | Format-Table LocalAddress, LocalPort, State
} else {
    Write-Host '  Port 21118 not listening yet. Open the RustDesk GUI once and click Apply on the Direct IP setting.' -ForegroundColor Yellow
}

# Get RustDesk ID with a 10s timeout (the CLI can hang on 1.4.6)
Write-Host '  Reading RustDesk ID (10s timeout)...'
$rdId = ''
$job = Start-Job -ScriptBlock {
    param($exe) & $exe --get-id 2>&1 | Out-String
} -ArgumentList $rdExe
if (Wait-Job -Job $job -Timeout 10) {
    $rdId = (Receive-Job -Job $job).Trim()
} else {
    Stop-Job -Job $job
    $rdId = '(--get-id timed out; check the GUI - top of main window)'
}
Remove-Job -Job $job -Force -ErrorAction SilentlyContinue

$tsIp = ''
if (Test-Path $tsExe) {
    $tsIp = (& $tsExe ip -4 2>$null | Out-String).Trim()
}
if (-not $tsIp) { $tsIp = '100.75.124.46' }

Write-Host ''
Write-Host '=== Setup Complete (one manual step left) ===' -ForegroundColor Green
Write-Host ''
Write-Host "  RustDesk ID:           $rdId"
Write-Host "  Tailscale IP:          $tsIp"
Write-Host "  Direct IP address:     ${tsIp}:21118"
Write-Host ''
Write-Host '  >>> SET THE PASSWORD FROM THE GUI (CLI is broken in v1.4.6):' -ForegroundColor Yellow
Write-Host '      1. Start menu -> RustDesk (open it once normally)'
Write-Host '      2. Click the 3-dot menu (top right) -> Security'
Write-Host '      3. Under "Permanent password" -> Set a strong password'
Write-Host '      4. Confirm "Enable direct IP access" is ON (port 21118)'
Write-Host '      5. Close the GUI - service keeps running for incoming connections'
Write-Host ''
Write-Host '  Connect from phone:'
Write-Host "    1. Tailscale ON, open RustDesk app"
Write-Host "    2. Address bar -> enter:  ${tsIp}:21118"
Write-Host '    3. Enter the password you set'
Write-Host ''
Read-Host 'Press Enter to close'
