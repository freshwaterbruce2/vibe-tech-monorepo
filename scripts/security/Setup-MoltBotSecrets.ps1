#!/usr/bin/env powershell
<#
.SYNOPSIS
    Automated security fix for MoltBot exposed secrets

.DESCRIPTION
    Moves hardcoded tokens from clawdbot.json to environment variables
    Creates backup before modifications
    Updates configuration to use ${ENV_VAR} syntax
    Verifies changes and restarts MoltBot

.PARAMETER SkipBackup
    Skip creating backup of current configuration (not recommended)

.PARAMETER SkipRestart
    Don't restart MoltBot after changes (for testing)

.EXAMPLE
    .\Setup-MoltBotSecrets.ps1
    Full automated setup with backup and restart

.EXAMPLE
    .\Setup-MoltBotSecrets.ps1 -SkipRestart
    Setup without restarting MoltBot (test mode)
#>

param(
    [switch]$SkipBackup = $false,
    [switch]$SkipRestart = $false
)

Write-Host "=== MoltBot Security Fix ===" -ForegroundColor Cyan
Write-Host "Moving secrets to environment variables"
Write-Host ""

# Configuration path
$configPath = "C:\Users\fresh_zxae3v6\.clawdbot\clawdbot.json"

if (-not (Test-Path $configPath)) {
    Write-Host "[ERROR] Configuration file not found: $configPath" -ForegroundColor Red
    exit 1
}

# Step 1: Backup current configuration
if (-not $SkipBackup) {
    Write-Host "[1/6] Creating backup..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "$configPath.before-security-fix.$timestamp"

    try {
        Copy-Item $configPath $backupPath -Force
        Write-Host "  [OK] Backup created: $backupPath" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] Backup failed: $($_.Exception.Message)" -ForegroundColor Red
        $continue = Read-Host "Continue without backup? (y/n)"
        if ($continue -ne "y") {
            Write-Host "[ABORT] Security fix cancelled" -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "[1/6] Skipping backup (as requested)" -ForegroundColor Gray
}

Write-Host ""

# Step 2: Read current configuration
Write-Host "[2/6] Reading current configuration..." -ForegroundColor Yellow

try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    Write-Host "  [OK] Configuration loaded" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to parse configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Extract current tokens
Write-Host "[3/6] Extracting tokens..." -ForegroundColor Yellow

$telegramToken = $config.channels.telegram.botToken
$discordToken = $config.channels.discord.token
$gatewayToken = $config.gateway.auth.token

if (-not $telegramToken -or $telegramToken -like '${*}') {
    Write-Host "  [INFO] Telegram token already using environment variable" -ForegroundColor Gray
    $telegramToken = $null
}

if (-not $discordToken -or $discordToken -like '${*}') {
    Write-Host "  [INFO] Discord token already using environment variable" -ForegroundColor Gray
    $discordToken = $null
}

if (-not $gatewayToken -or $gatewayToken -like '${*}') {
    Write-Host "  [INFO] Gateway token already using environment variable" -ForegroundColor Gray
    $gatewayToken = $null
}

if (-not $telegramToken -and -not $discordToken -and -not $gatewayToken) {
    Write-Host "  [INFO] All tokens already secure!" -ForegroundColor Green
    Write-Host "[COMPLETE] No changes needed" -ForegroundColor Green
    exit 0
}

Write-Host "  [OK] Tokens extracted" -ForegroundColor Green
Write-Host ""

# Step 4: Set environment variables
Write-Host "[4/6] Setting environment variables..." -ForegroundColor Yellow

$envVarsSet = 0

if ($telegramToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("TELEGRAM_BOT_TOKEN", $telegramToken, "User")
        Write-Host "  [OK] TELEGRAM_BOT_TOKEN set" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set TELEGRAM_BOT_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($discordToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("DISCORD_BOT_TOKEN", $discordToken, "User")
        Write-Host "  [OK] DISCORD_BOT_TOKEN set" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set DISCORD_BOT_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($gatewayToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("MOLTBOT_GATEWAY_TOKEN", $gatewayToken, "User")
        Write-Host "  [OK] MOLTBOT_GATEWAY_TOKEN set" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set MOLTBOT_GATEWAY_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Step 5: Update configuration file
Write-Host "[5/6] Updating configuration file..." -ForegroundColor Yellow

try {
    # Update configuration object
    if ($telegramToken) {
        $config.channels.telegram.botToken = '${TELEGRAM_BOT_TOKEN}'
    }

    if ($discordToken) {
        $config.channels.discord.token = '${DISCORD_BOT_TOKEN}'
    }

    if ($gatewayToken) {
        $config.gateway.auth.token = '${MOLTBOT_GATEWAY_TOKEN}'
    }

    # Write updated configuration
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
    Write-Host "  [OK] Configuration updated" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to update configuration: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [INFO] Restore from backup: $backupPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 6: Restart MoltBot (if not skipped)
if (-not $SkipRestart) {
    Write-Host "[6/6] Restarting MoltBot..." -ForegroundColor Yellow

    # Check if clawdbot command exists
    $clawdbot = Get-Command clawdbot -ErrorAction SilentlyContinue

    if ($clawdbot) {
        try {
            & clawdbot restart 2>&1 | Out-Null
            Start-Sleep -Seconds 3
            Write-Host "  [OK] MoltBot restarted" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Failed to restart: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "  [INFO] Restart manually: clawdbot restart" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [INFO] clawdbot command not found" -ForegroundColor Gray
        Write-Host "  [INFO] Restart MoltBot manually when ready" -ForegroundColor Gray
    }
} else {
    Write-Host "[6/6] Skipping restart (as requested)" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "=== Security Fix Complete ===" -ForegroundColor Green
Write-Host "Environment Variables Set: $envVarsSet"
Write-Host "Configuration Updated: Yes"
Write-Host "Backup Location: $backupPath"
Write-Host ""

# Verification instructions
Write-Host "Verification Steps:" -ForegroundColor Cyan
Write-Host "  1. Check environment variables:"
Write-Host "     [System.Environment]::GetEnvironmentVariable('TELEGRAM_BOT_TOKEN', 'User')" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Verify MoltBot status:"
Write-Host "     clawdbot doctor" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Test connections:"
Write-Host "     Send test message to Telegram bot" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Check logs:"
Write-Host "     Get-Content D:\logs\moltbot-cron.log -Tail 20" -ForegroundColor Gray
Write-Host ""

# Token rotation reminder
Write-Host "IMPORTANT: Token Rotation Recommended" -ForegroundColor Yellow
Write-Host "These tokens were exposed in plaintext." -ForegroundColor Yellow
Write-Host "Consider rotating them for maximum security:" -ForegroundColor Yellow
Write-Host "  - Telegram: @BotFather -> /revoke" -ForegroundColor Gray
Write-Host "  - Discord: Developer Portal -> Regenerate Token" -ForegroundColor Gray
Write-Host "  - Gateway: Generate new with: .\Generate-GatewayToken.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "See: SECURITY_FIX_REQUIRED.md for detailed rotation instructions" -ForegroundColor Gray
Write-Host ""

exit 0
