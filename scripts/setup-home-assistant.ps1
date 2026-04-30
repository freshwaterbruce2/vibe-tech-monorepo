# Home Assistant OS in VirtualBox - tailnet-accessible smart home dashboard
# All artifacts go on D:\. Idempotent - safe to re-run.
#
# End state:
#   - VirtualBox 7.x installed
#   - VM "home-assistant" with 3 GB RAM, EFI, bridged "Wi-Fi"
#   - HAOS .vdi at D:\virtualbox\home-assistant\
#   - Scheduled task auto-starts VM headless at boot (SYSTEM)
#   - HA web UI at http://homeassistant.local:8123 (or VM's DHCP IP)

#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

# --- Constants ---------------------------------------------------------------
$HaosVersion = '17.2'
$HaosUrl     = "https://github.com/home-assistant/operating-system/releases/download/$HaosVersion/haos_ova-$HaosVersion.vdi.zip"
$VmName      = 'home-assistant'
$VmDir       = 'D:\virtualbox'
$VdiDir      = Join-Path $VmDir $VmName
$VdiPath     = Join-Path $VdiDir "haos_ova-$HaosVersion.vdi"
$ZipDir      = 'D:\temp'
$ZipPath     = Join-Path $ZipDir "haos_ova-$HaosVersion.vdi.zip"
$BackupsDir  = 'D:\backups\home-assistant'
$VBox        = 'C:\Program Files\Oracle\VirtualBox\VBoxManage.exe'
$RamMB       = 3072
$Cpus        = 2
$BridgeNic   = 'Wi-Fi'
$TaskName    = 'HomeAssistant-AutoStart'

Write-Host ''
Write-Host '=== Home Assistant OS Install (VirtualBox) ===' -ForegroundColor Cyan
Write-Host ''

# --- 1. Install VirtualBox via winget ---------------------------------------
Write-Host '[1/9] Installing VirtualBox...' -ForegroundColor Cyan
if (Test-Path $VBox) {
    $ver = (& $VBox --version 2>&1).Trim()
    Write-Host "  Already installed: $ver" -ForegroundColor Green
} else {
    & winget install -e --id Oracle.VirtualBox --silent `
        --accept-package-agreements --accept-source-agreements
    Write-Host '  Waiting 15s for installer...'
    Start-Sleep -Seconds 15
    if (-not (Test-Path $VBox)) {
        throw "VirtualBox install failed: $VBox not found"
    }
    Write-Host "  Installed: $((& $VBox --version 2>&1).Trim())" -ForegroundColor Green
}

# --- 2. Make D:\ directories -------------------------------------------------
Write-Host '[2/9] Creating D:\ directories...' -ForegroundColor Cyan
foreach ($d in @($ZipDir, $VmDir, $VdiDir, $BackupsDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "  Created $d" -ForegroundColor Green
    } else {
        Write-Host "  Exists  $d"
    }
}

# --- 3. Download HAOS .vdi.zip if not present + correct size ----------------
Write-Host "[3/9] Downloading HAOS $HaosVersion .vdi.zip (~604 MB)..." -ForegroundColor Cyan
$expectedMin = 600MB
$needDownload = $true
if (Test-Path $ZipPath) {
    $size = (Get-Item $ZipPath).Length
    if ($size -gt $expectedMin) {
        Write-Host "  Already downloaded ($([math]::Round($size/1MB,1)) MB)" -ForegroundColor Green
        $needDownload = $false
    } else {
        Write-Host "  Existing file too small ($size bytes), re-downloading"
        Remove-Item $ZipPath -Force
    }
}
if ($needDownload) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    # Use BITS for better progress display + resumability
    try {
        Start-BitsTransfer -Source $HaosUrl -Destination $ZipPath -DisplayName 'HAOS download' -Description $HaosUrl
    } catch {
        Write-Host "  BITS failed, falling back to Invoke-WebRequest..." -ForegroundColor Yellow
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $HaosUrl -OutFile $ZipPath -UseBasicParsing
        $ProgressPreference = 'Continue'
    }
    $size = (Get-Item $ZipPath).Length
    Write-Host "  Downloaded $([math]::Round($size/1MB,1)) MB" -ForegroundColor Green
}

# --- 4. Extract .vdi if not present + correct size --------------------------
Write-Host '[4/9] Extracting .vdi...' -ForegroundColor Cyan
$expectedVdiMin = 1GB  # initial sparse usage; real cap is 32 GB
if ((Test-Path $VdiPath) -and ((Get-Item $VdiPath).Length -gt $expectedVdiMin)) {
    Write-Host "  Already extracted ($([math]::Round((Get-Item $VdiPath).Length/1GB,2)) GB on disk)" -ForegroundColor Green
} else {
    if (Test-Path $VdiPath) { Remove-Item $VdiPath -Force }
    Write-Host '  Extracting (32 GB sparse VDI - takes ~30-60s)...'
    Expand-Archive -Path $ZipPath -DestinationPath $VdiDir -Force
    if (-not (Test-Path $VdiPath)) {
        # zip may extract under a subfolder name
        $found = Get-ChildItem -Path $VdiDir -Filter "haos_ova-*.vdi" -Recurse | Select-Object -First 1
        if ($found -and $found.FullName -ne $VdiPath) {
            Move-Item -Path $found.FullName -Destination $VdiPath -Force
        }
    }
    if (-not (Test-Path $VdiPath)) {
        throw "Failed to extract VDI to $VdiPath"
    }
    Write-Host "  Extracted to $VdiPath" -ForegroundColor Green
}

# --- 5. Verify "Wi-Fi" is a valid bridged interface --------------------------
Write-Host '[5/9] Verifying bridged adapter...' -ForegroundColor Cyan
$bridgedRaw = & $VBox list bridgedifs
$bridgeNames = ($bridgedRaw | Select-String '^Name:\s+(.*)$').Matches | ForEach-Object { $_.Groups[1].Value.Trim() }
if ($BridgeNic -in $bridgeNames) {
    Write-Host "  Found exact match: '$BridgeNic'" -ForegroundColor Green
} else {
    $candidate = $bridgeNames | Where-Object { $_ -like "*Wi-Fi*" -or $_ -like "*Wireless*" } | Select-Object -First 1
    if ($candidate) {
        Write-Host "  '$BridgeNic' not found exactly, using '$candidate'" -ForegroundColor Yellow
        $BridgeNic = $candidate
    } else {
        Write-Host "  Available bridged interfaces:"
        $bridgeNames | ForEach-Object { Write-Host "    - $_" }
        throw "No Wi-Fi bridged interface found. Pick one from the list above and re-run with `$BridgeNic` set."
    }
}

# --- 6. Create + configure VM (skip if exists) ------------------------------
Write-Host '[6/9] Creating VM...' -ForegroundColor Cyan
$existing = & $VBox list vms 2>&1 | Select-String "`"$VmName`""
if ($existing) {
    Write-Host "  VM '$VmName' already exists, skipping create" -ForegroundColor Green
} else {
    & $VBox createvm --name $VmName --ostype 'Linux_64' --basefolder $VmDir --register
    & $VBox modifyvm $VmName `
        --firmware efi64 `
        --memory $RamMB `
        --cpus $Cpus `
        --boot1 disk --boot2 none --boot3 none --boot4 none `
        --audio-driver none --audio-enabled off `
        --usb-ehci off --usb-ohci off --usb-xhci off
    & $VBox modifyvm $VmName `
        --nic1 bridged --bridgeadapter1 $BridgeNic `
        --nicpromisc1 allow-all --cableconnected1 on --nictype1 82540EM
    & $VBox storagectl $VmName --name 'SATA' --add sata --controller IntelAhci --portcount 1 --bootable on
    & $VBox storageattach $VmName --storagectl 'SATA' --port 0 --device 0 --type hdd --medium $VdiPath
    Write-Host "  VM created (RAM=$RamMB MB, CPUs=$Cpus, EFI, bridged $BridgeNic)" -ForegroundColor Green
}

# --- 7. Register Task Scheduler entry to auto-start at boot ------------------
Write-Host '[7/9] Registering boot auto-start task...' -ForegroundColor Cyan
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
$action = New-ScheduledTaskAction -Execute $VBox `
    -Argument "startvm `"$VmName`" --type headless"
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'  # let networking settle
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings `
    -Description 'Auto-starts the Home Assistant OS VM at boot, headless' | Out-Null
Write-Host "  Task '$TaskName' registered (runs as SYSTEM at startup, 30s delay)" -ForegroundColor Green

# --- 8. Start VM headless now (so onboarding can begin immediately) ---------
Write-Host '[8/9] Starting VM headless...' -ForegroundColor Cyan
$running = & $VBox list runningvms 2>&1 | Select-String "`"$VmName`""
if ($running) {
    Write-Host '  VM already running' -ForegroundColor Green
} else {
    & $VBox startvm $VmName --type headless
    Write-Host '  VM start command sent. HAOS boots in ~60-90s...'
}

# --- 9. Wait for HA on the network + report ---------------------------------
Write-Host '[9/9] Waiting for HA to come online (max 3 min)...' -ForegroundColor Cyan
$haIp = $null
$haUrl = $null
$start = Get-Date
$timeout = New-TimeSpan -Minutes 3
while ((Get-Date) - $start -lt $timeout) {
    Start-Sleep -Seconds 10
    try {
        $r = Resolve-DnsName -Name homeassistant.local -Type A -DnsOnly -QuickTimeout -ErrorAction Stop
        $haIp = ($r | Where-Object { $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
        if ($haIp) {
            $haUrl = "http://$haIp`:8123"
            try {
                $resp = Invoke-WebRequest -Uri $haUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                if ($resp.StatusCode -eq 200) {
                    Write-Host "  HA is responding at $haUrl" -ForegroundColor Green
                    break
                }
            } catch {
                Write-Host "  IP found ($haIp) but HA web UI not ready yet, waiting..." -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host '  homeassistant.local not yet resolvable, waiting...' -ForegroundColor Yellow
    }
}

if (-not $haIp) {
    Write-Host '  HA did not come online within 3 min. Try:' -ForegroundColor Yellow
    Write-Host "    1. Resolve-DnsName homeassistant.local"
    Write-Host '    2. Check router DHCP leases for a new device'
    Write-Host "    3. & '$VBox' controlvm $VmName screenshotpng D:\temp\haos.png  (then view it)"
}

# --- Summary -----------------------------------------------------------------
Write-Host ''
Write-Host '=== Setup Complete ===' -ForegroundColor Green
Write-Host ''
Write-Host "  VM:              $VmName"
Write-Host "  RAM:             $RamMB MB"
Write-Host "  CPUs:            $Cpus"
Write-Host "  Disk:            $VdiPath"
Write-Host "  Network:         bridged on '$BridgeNic'"
Write-Host "  Auto-start task: $TaskName (SYSTEM, at boot + 30s)"
if ($haIp) {
    Write-Host "  HAOS IP:         $haIp" -ForegroundColor Green
    Write-Host "  HAOS URL:        $haUrl" -ForegroundColor Green
}
Write-Host ''
Write-Host '  Next steps:' -ForegroundColor Cyan
Write-Host '    1. Open the URL above in your browser to start HA onboarding'
Write-Host '    2. RESERVE the HAOS IP in your router DHCP settings (so it never changes)'
Write-Host '    3. Skip Nabu Casa cloud signup - your tailnet does the same thing for free'
Write-Host '    4. From phone (cellular + Tailscale on): hit the same URL - subnet route handles it'
Write-Host ''
Write-Host '  To stop:    & '"'"$VBox"'"' controlvm '"'"$VmName"'"' acpipowerbutton'
Write-Host '  To start:   & '"'"$VBox"'"' startvm '"'"$VmName"'"' --type headless'
Write-Host '  To remove:  Unregister-ScheduledTask -TaskName '"'"$TaskName"'"' -Confirm:$false'
Write-Host '              & '"'"$VBox"'"' unregistervm '"'"$VmName"'"' --delete'
Write-Host ''
Read-Host 'Press Enter to close'
