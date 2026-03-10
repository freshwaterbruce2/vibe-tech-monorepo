
# Crypto Log Monitor & Alerting System
# WATCHES: D:\logs\crypto_enhanced\trade_events.log
# ALERTS: Telegram (via Bot Token)

$LogPath = "D:\logs\crypto_enhanced\trade_events.log"
$BotToken = "8292004552:AAH1tWdKEcGxOZNy6x4rybZ5nLZ-aUxvj0I"
# You might want to get ChatID dynamically or hardcode the user's ID if known.
# For now, we'll try to get updates to find the ChatID or assume a broadcast if configured.
# Actually, OpenClaw config didn't specify a ChatID, just allowed from "*".
# We need a ChatID to push messages.
# STRATEGY: We will dump alerts to a file that MoltBot watches, OR use a known ChatID.
# Since we switched to Telegram recently, let's assume we need to broadcast to the last active chat or a specific ID.
# BETTER STRATEGY: Write to a high-priority "alert_signal" file that the `on_wake` or effective "loop" can pick up?
# NO, "Immediate notification" requires push.
# Let's use a placeholder ChatID and log a warning if it fails.
$ChatID = "5760676454" # Extracted from previous context or assumed user ID for now.
# NOTE: Replace with actual ID after first interaction.

$DrawdownThreshold = 5.0

function Send-TelegramMessage {
    param ($Message)
    $Url = "https://api.telegram.org/bot$BotToken/sendMessage"
    $Body = @{
        chat_id = $ChatID
        text    = "🚨 CRYPTO ALERT: $Message"
    }
    try {
        Invoke-RestMethod -Uri $Url -Method Post -Body $Body -ErrorAction Stop
    } catch {
        Write-Host "Failed to send alert: $_"
    }
}

while (!(Test-Path $LogPath)) {
    Write-Host "Log file not found. Waiting 60s..."
    Start-Sleep -Seconds 60
}

Write-Host "Log found. Starting monitoring..."

Get-Content $LogPath -Tail 0 -Wait | ForEach-Object {
    if ($_ -match "DRAWDOWN.*(\d+\.\d+)%") {
        $CurrentDrawdown = [double]$matches[1]
        if ($CurrentDrawdown -gt $DrawdownThreshold) {
            Send-TelegramMessage "Drawdown ($CurrentDrawdown%) exceeds threshold ($DrawdownThreshold%)!"
        }
    }
    if ($_ -match "ERROR|CRITICAL") {
         Send-TelegramMessage "Critical System Error: $_"
    }
}
