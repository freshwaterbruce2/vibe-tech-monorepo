
# MoltBot Boot Hook - Health Check
$LogPath = "D:\logs\moltbot\boot.log"
$Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Ensure log directory exists
if (!(Test-Path "D:\logs\moltbot")) {
    New-Item -ItemType Directory -Force -Path "D:\logs\moltbot" | Out-Null
}

try {
    # 1. Check Connectivity
    $Ping = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet

    # 2. Check Learning System
    $Learning = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet

    $Status = if ($Ping) { "ONLINE" } else { "OFFLINE" }
    $LearnStatus = if ($Learning) { "CONNECTED" } else { "DISCONNECTED" }

    "$Date [BOOT] System: $Status | Learning Layer: $LearnStatus" | Out-File -FilePath $LogPath -Append

    # 3. Emit Event for OpenClaw
    # This file signal can be watched by the main process
    Set-Content -Path "C:\Users\fresh_zxae3v6\.openclaw\boot_signal" -Value $Date
}
catch {
    "$Date [ERROR] Boot hook failed: $_" | Out-File -FilePath $LogPath -Append
}
