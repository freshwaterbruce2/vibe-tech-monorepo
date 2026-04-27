# Remote Access Phase 3 - RustDesk for GUI sessions over Tailscale
# Installs RustDesk via winget, runs it as a Windows service, scopes inbound
# port 21118 to the Tailscale CGNAT range (100.64.0.0/10) so connections can
# only come from tailnet peers.

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$rdExe = 'C:\Program Files\RustDesk\rustdesk.exe'
$tsExe = 'C:\Program Files\Tailscale\tailscale.exe'

Write-Host ''
Write-Host '=== RustDesk Setup (Tailscale-routed) ===' -ForegroundColor Cyan
Write-Host ''

# --- 1. Prompt for permanent password up-front -------------------------------
$pw = $null
while (-not $pw -or $pw.Length -lt 12) {
    $sec = Read-Host 'Enter a strong RustDesk permanent password (min 12 chars)' -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $pw = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    if ($pw.Length -lt 12) {
        Write-Host '  Too short. Try again.' -ForegroundColor Yellow
    }
}
Write-Host ''

# --- 2. Install RustDesk (direct download from GitHub releases) -------------
# winget catalog doesn't currently surface RustDesk.RustDesk, so we pull the
# official installer straight from the GitHub release and run --silent-install.
Write-Host '[1/7] Installing RustDesk (direct download)...' -ForegroundColor Cyan
if (Test-Path $rdExe) {
    Write-Host "  Already installed at $rdExe" -ForegroundColor Green
} else {
    Write-Host '  Querying latest release from github.com/rustdesk/rustdesk...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $rel = Invoke-RestMethod -Uri 'https://api.github.com/repos/rustdesk/rustdesk/releases/latest' -UseBasicParsing
    $asset = $rel.assets | Where-Object {
        $_.name -like '*x86_64.exe' -and $_.name -notlike '*-aio*' -and $_.name -notlike '*-sciter*'
    } | Select-Object -First 1
    if (-not $asset) { throw 'No suitable RustDesk x86_64 .exe asset found in latest release.' }
    $tmp = Join-Path $env:TEMP $asset.name
    Write-Host "  Downloading $($asset.name) ($([math]::Round($asset.size/1MB,1)) MB)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing
    Write-Host "  Running silent install..."
    Start-Process -FilePath $tmp -ArgumentList '--silent-install' -Wait
    Write-Host '  Waiting 15s for installer to finish writing files...'
    Start-Sleep -Seconds 15
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
if (-not (Test-Path $rdExe)) {
    throw "RustDesk install failed: $rdExe not found"
}

# --- 3. Install + start the Windows service ---------------------------------
Write-Host '[2/7] Installing RustDesk service...' -ForegroundColor Cyan
$svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
if (-not $svc) {
    & $rdExe --install-service
    Start-Sleep -Seconds 10
    $svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
}
if ($svc) {
    Set-Service -Name RustDesk -StartupType Automatic
    if ($svc.Status -ne 'Running') { Start-Service -Name RustDesk }
    $svc = Get-Service -Name 'RustDesk'
    Write-Host "  Service: $($svc.Status), StartupType: $($svc.StartType)" -ForegroundColor Green
} else {
    Write-Host '  WARNING: RustDesk service not registered. Try a reboot or rerun.' -ForegroundColor Yellow
}

# --- 4. Set the permanent password ------------------------------------------
Write-Host '[3/7] Setting permanent password...' -ForegroundColor Cyan
try {
    & $rdExe --password $pw 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    Write-Host '  Password applied (verify in GUI Security settings if connection fails).' -ForegroundColor Green
} catch {
    Write-Host "  WARNING: --password CLI failed ($($_.Exception.Message)). Set it from the RustDesk GUI." -ForegroundColor Yellow
}

# --- 5. Force Direct IP Access on port 21118, disable LAN discovery ----------
# Settings live under the LocalService profile because the service handles
# incoming connections. We also write the user-profile copy so the GUI stays
# consistent if you open it.
Write-Host '[4/7] Enabling Direct IP Access (port 21118), disabling LAN discovery...' -ForegroundColor Cyan

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

# --- 6. Restart service to apply config -------------------------------------
Write-Host '[5/7] Restarting service to apply config...' -ForegroundColor Cyan
if (Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue) {
    Restart-Service -Name RustDesk -Force
    Start-Sleep -Seconds 8
}

# --- 7. Firewall: allow TCP 21118 only from Tailscale CGNAT (100.64.0.0/10) -
Write-Host '[6/7] Adding firewall rule (TCP 21118, Tailscale peers only)...' -ForegroundColor Cyan
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

# --- 8. Verify + report ------------------------------------------------------
Write-Host '[7/7] Verifying...' -ForegroundColor Cyan
$listen = Get-NetTCPConnection -LocalPort 21118 -State Listen -ErrorAction SilentlyContinue
if ($listen) {
    Write-Host '  Port 21118 is LISTENING.' -ForegroundColor Green
} else {
    Write-Host '  Port 21118 not yet listening (service may need ~30s more, or open RustDesk GUI once and click Apply).' -ForegroundColor Yellow
}

$rdId = ''
try {
    $rdId = (& $rdExe --get-id 2>$null | Out-String).Trim()
} catch {}
if (-not $rdId) { $rdId = '(unknown - run "rustdesk.exe --get-id" once service is settled)' }

$tsIp = ''
if (Test-Path $tsExe) {
    $tsIp = (& $tsExe ip -4 2>$null | Out-String).Trim()
}
if (-not $tsIp) { $tsIp = '100.75.124.46' }

Write-Host ''
Write-Host '=== RustDesk Setup Complete ===' -ForegroundColor Green
Write-Host ''
Write-Host "  RustDesk ID:           $rdId"
Write-Host "  Tailscale IP:          $tsIp"
Write-Host "  Direct IP address:     ${tsIp}:21118"
Write-Host ''
Write-Host '  Connect from phone (do NOT use the RustDesk ID - that goes via public relay):'
Write-Host "    1. Open RustDesk app on phone (Tailscale must be ON)"
Write-Host "    2. Tap the top address bar -> enter:  ${tsIp}:21118"
Write-Host '    3. Tap connect, enter the password you just set'
Write-Host ''
Write-Host '  iOS app:     "RustDesk Remote Desktop"  (App Store)'
Write-Host '  Android app: "RustDesk Remote Desktop"  (Google Play, publisher: RustDesk)'
Write-Host ''
Read-Host 'Press Enter to close'
