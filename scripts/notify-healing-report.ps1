# notify-healing-report.ps1
# Sends self-healing report summary to Telegram via the bot API.
# Called by self-healing-cron.ps1 after each run.

param(
    [Parameter(Mandatory)][string]$ReportPath,
    [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"

# Load bot token from Gravity Claw .env
$envFile = "C:\dev\apps\gravity-claw\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Gravity Claw .env not found at $envFile"
    exit 1
}

$envContent = Get-Content $envFile
$botToken = ($envContent | Where-Object { $_ -match '^TELEGRAM_BOT_TOKEN=' }) -replace '^TELEGRAM_BOT_TOKEN=', ''
$chatId = ($envContent | Where-Object { $_ -match '^TELEGRAM_ALLOWED_USER_IDS=' }) -replace '^TELEGRAM_ALLOWED_USER_IDS=', ''

if (-not $botToken -or -not $chatId) {
    Write-Error "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_USER_IDS in .env"
    exit 1
}

# Parse report JSON
$report = Get-Content $ReportPath -Raw | ConvertFrom-Json

# Build summary message
$totalLoops = ($report | Measure-Object).Count
$fixedCount = 0
$failedCount = 0
$blockedCount = 0
$loopSummaries = @()

foreach ($result in $report) {
    if ($result.status -eq "fixed") { $fixedCount++ }
    if ($result.status -eq "failed") { $failedCount++ }
    if ($result.blocked_files) { $blockedCount += $result.blocked_files.Count }

    $emoji = switch ($result.status) {
        "ok"     { [char]0x2705 }  # ✅
        "fixed"  { [char]0x1F527 } # 🔧
        "failed" { [char]0x274C }  # ❌
        default  { [char]0x2139 }  # ℹ️
    }
    $loopSummaries += "$emoji $($result.loop): $($result.status)"
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$message = @"
🛠️ *Self-Healing Report* — $timestamp

*Loops:*
$($loopSummaries -join "`n")

📊 *Summary:*
• Fixed: $fixedCount
• Failed: $failedCount
• Safety blocks: $blockedCount

📁 Report: ``$ReportPath``
"@

if ($LogPath) {
    $message += "`n📝 Log: ``$LogPath``"
}

# Send via Telegram Bot API
$uri = "https://api.telegram.org/bot$botToken/sendMessage"
$body = @{
    chat_id    = $chatId
    text       = $message
    parse_mode = "Markdown"
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    if ($response.ok) {
        Write-Host "Telegram notification sent to chat $chatId"
    } else {
        Write-Warning "Telegram API returned: $($response | ConvertTo-Json -Depth 2)"
    }
} catch {
    Write-Error "Failed to send Telegram notification: $_"
    exit 1
}
