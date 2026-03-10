#!/usr/bin/env powershell
<#
.SYNOPSIS
    Automated security fix for MoltBot exposed secrets (Machine Scope)

.DESCRIPTION
    Moves hardcoded tokens from clawdbot.json to MACHINE-SCOPED environment variables
    Creates backup before modifications
    Updates configuration to use ${ENV_VAR} syntax
    Verifies changes and restarts MoltBot

    IMPORTANT: This script REQUIRES Administrator privileges to set Machine-scoped variables

.PARAMETER SkipBackup
    Skip creating backup of current configuration (not recommended)

.PARAMETER SkipRestart
    Don't restart MoltBot after changes (for testing)

.EXAMPLE
    .\Setup-MoltBotSecrets-MachineScope.ps1
    Full automated setup with backup and restart (requires admin)

.EXAMPLE
    .\Setup-MoltBotSecrets-MachineScope.ps1 -SkipRestart
    Setup without restarting MoltBot (test mode)
#>

param(
    [switch]$SkipBackup = $false,
    [switch]$SkipRestart = $false
)

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator privileges" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run this command to restart with admin privileges:" -ForegroundColor Cyan
    Write-Host "Start-Process powershell -Verb RunAs -ArgumentList '-NoExit', '-File', '$PSCommandPath'" -ForegroundColor Gray
    exit 1
}

Write-Host "=== MoltBot Security Fix (Machine Scope) ===" -ForegroundColor Cyan
Write-Host "Moving secrets to MACHINE-SCOPED environment variables"
Write-Host "Running as Administrator" -ForegroundColor Green
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
    $backupPath = "$configPath.before-machine-scope-fix.$timestamp"

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

# Check if tokens are already environment variable references
$telegramIsEnvVar = $telegramToken -like '${*}'
$discordIsEnvVar = $discordToken -like '${*}'
$gatewayIsEnvVar = $gatewayToken -like '${*}'

if ($telegramIsEnvVar) {
    Write-Host "  [INFO] Telegram token already using environment variable" -ForegroundColor Gray
    # Try to get actual value from User scope first
    $telegramToken = [System.Environment]::GetEnvironmentVariable("TELEGRAM_BOT_TOKEN", "User")
    if (-not $telegramToken) {
        Write-Host "  [WARN] Could not retrieve TELEGRAM_BOT_TOKEN from User scope" -ForegroundColor Yellow
        $telegramToken = $null
    }
}

if ($discordIsEnvVar) {
    Write-Host "  [INFO] Discord token already using environment variable" -ForegroundColor Gray
    $discordToken = [System.Environment]::GetEnvironmentVariable("DISCORD_BOT_TOKEN", "User")
    if (-not $discordToken) {
        Write-Host "  [WARN] Could not retrieve DISCORD_BOT_TOKEN from User scope" -ForegroundColor Yellow
        $discordToken = $null
    }
}

if ($gatewayIsEnvVar) {
    Write-Host "  [INFO] Gateway token already using environment variable" -ForegroundColor Gray
    $gatewayToken = [System.Environment]::GetEnvironmentVariable("MOLTBOT_GATEWAY_TOKEN", "User")
    if (-not $gatewayToken) {
        Write-Host "  [WARN] Could not retrieve MOLTBOT_GATEWAY_TOKEN from User scope" -ForegroundColor Yellow
        $gatewayToken = $null
    }
}

if (-not $telegramToken -and -not $discordToken -and -not $gatewayToken) {
    Write-Host "  [ERROR] No tokens found to migrate" -ForegroundColor Red
    Write-Host "  [INFO] Tokens may already be at Machine scope" -ForegroundColor Gray
    exit 1
}

Write-Host "  [OK] Tokens extracted" -ForegroundColor Green
Write-Host ""

# Step 4: Set MACHINE-SCOPED environment variables
Write-Host "[4/6] Setting MACHINE-SCOPED environment variables..." -ForegroundColor Yellow

$envVarsSet = 0

if ($telegramToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("TELEGRAM_BOT_TOKEN", $telegramToken, "Machine")
        Write-Host "  [OK] TELEGRAM_BOT_TOKEN set (Machine scope)" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set TELEGRAM_BOT_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($discordToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("DISCORD_BOT_TOKEN", $discordToken, "Machine")
        Write-Host "  [OK] DISCORD_BOT_TOKEN set (Machine scope)" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set DISCORD_BOT_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($gatewayToken) {
    try {
        [System.Environment]::SetEnvironmentVariable("MOLTBOT_GATEWAY_TOKEN", $gatewayToken, "Machine")
        Write-Host "  [OK] MOLTBOT_GATEWAY_TOKEN set (Machine scope)" -ForegroundColor Green
        $envVarsSet++
    } catch {
        Write-Host "  [ERROR] Failed to set MOLTBOT_GATEWAY_TOKEN: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Remove User-scoped variables if they exist
Write-Host "  [INFO] Cleaning up User-scoped variables..." -ForegroundColor Gray
try {
    [System.Environment]::SetEnvironmentVariable("TELEGRAM_BOT_TOKEN", $null, "User")
    [System.Environment]::SetEnvironmentVariable("DISCORD_BOT_TOKEN", $null, "User")
    [System.Environment]::SetEnvironmentVariable("MOLTBOT_GATEWAY_TOKEN", $null, "User")
    Write-Host "  [OK] User-scoped variables removed" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Could not remove User-scoped variables: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Update configuration file (if not already done)
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
    Write-Host "[6/6] Starting fresh PowerShell session for MoltBot..." -ForegroundColor Yellow
    Write-Host "  [INFO] Machine-scoped variables require a fresh process" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [ACTION] Please open a NEW PowerShell window and run:" -ForegroundColor Cyan
    Write-Host "    clawdbot start" -ForegroundColor White
    Write-Host "    clawdbot doctor" -ForegroundColor White
    Write-Host ""
    Write-Host "  [INFO] The new session will have access to Machine-scoped variables" -ForegroundColor Gray
} else {
    Write-Host "[6/6] Skipping restart (as requested)" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "=== Security Fix Complete ===" -ForegroundColor Green
Write-Host "Environment Variables Set: $envVarsSet (Machine scope)"
Write-Host "Configuration Updated: Yes"
Write-Host "Backup Location: $backupPath"
Write-Host ""

# Verification instructions
Write-Host "Verification Steps:" -ForegroundColor Cyan
Write-Host "  1. Open NEW PowerShell window (to load Machine variables)"
Write-Host ""
Write-Host "  2. Check environment variables:"
Write-Host "     [System.Environment]::GetEnvironmentVariable('TELEGRAM_BOT_TOKEN', 'Machine')" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Start MoltBot:"
Write-Host "     clawdbot start" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Verify MoltBot status:"
Write-Host "     clawdbot doctor" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Test connections:"
Write-Host "     Send test message to Telegram bot" -ForegroundColor Gray
Write-Host ""
Write-Host "  6. Check logs:"
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
