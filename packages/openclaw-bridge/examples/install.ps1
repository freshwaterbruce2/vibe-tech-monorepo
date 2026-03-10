#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick installer for OpenClaw VibeTech Bridge extension

.DESCRIPTION
    Installs the VibeTech Bridge extension and webhook handler to OpenClaw

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Verbose
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Configuration
$OpenClawDir = "$env:USERPROFILE\.openclaw"
$ExtensionName = 'vibetech-bridge'
$SourceDir = $PSScriptRoot

Write-Host "🚀 OpenClaw VibeTech Bridge Installer" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Check OpenClaw installation
Write-Host "1️⃣  Checking OpenClaw installation..." -ForegroundColor Yellow

if (-not (Get-Command openclaw -ErrorAction SilentlyContinue)) {
    Write-Host "❌ OpenClaw not found in PATH" -ForegroundColor Red
    Write-Host "`n💡 Install OpenClaw:" -ForegroundColor Yellow
    Write-Host "   npm install -g openclaw@2026.2.19-2`n"
    exit 1
}

$openclawVersion = openclaw --version 2>&1
Write-Host "✅ OpenClaw found: $openclawVersion" -ForegroundColor Green

# Step 2: Create directories
Write-Host "`n2️⃣  Creating directories..." -ForegroundColor Yellow

$directories = @(
    "$OpenClawDir\extensions\$ExtensionName",
    "$OpenClawDir\extensions\$ExtensionName\commands",
    "$OpenClawDir\webhooks",
    "$OpenClawDir\logs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "  Exists: $dir" -ForegroundColor Gray
    }
}

Write-Host "✅ Directories ready" -ForegroundColor Green

# Step 3: Copy extension files
Write-Host "`n3️⃣  Installing extension..." -ForegroundColor Yellow

$extensionFiles = @{
    "extension\manifest.json" = "extensions\$ExtensionName\manifest.json"
    "extension\index.js" = "extensions\$ExtensionName\index.js"
    "extension\commands\mcp.js" = "extensions\$ExtensionName\commands\mcp.js"
    "extension\commands\files.js" = "extensions\$ExtensionName\commands\files.js"
    "extension\commands\search.js" = "extensions\$ExtensionName\commands\search.js"
    "extension\commands\screenshot.js" = "extensions\$ExtensionName\commands\screenshot.js"
}

foreach ($file in $extensionFiles.GetEnumerator()) {
    $source = Join-Path $SourceDir $file.Key
    $dest = Join-Path $OpenClawDir $file.Value

    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Force
        Write-Host "  Copied: $($file.Key)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠️  Not found: $($file.Key)" -ForegroundColor Yellow
    }
}

Write-Host "✅ Extension installed" -ForegroundColor Green

# Step 4: Copy webhook handler
Write-Host "`n4️⃣  Installing webhook handler..." -ForegroundColor Yellow

$webhookSource = Join-Path $SourceDir "webhook-handler.js"
$webhookDest = Join-Path $OpenClawDir "webhooks\on_message.js"

if (Test-Path $webhookSource) {
    Copy-Item -Path $webhookSource -Destination $webhookDest -Force
    Write-Host "  Copied: webhook-handler.js" -ForegroundColor Gray
    Write-Host "✅ Webhook handler installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Webhook handler not found: $webhookSource" -ForegroundColor Yellow
}

# Step 5: Update OpenClaw config
Write-Host "`n5️⃣  Updating OpenClaw configuration..." -ForegroundColor Yellow

$configPath = Join-Path $OpenClawDir "openclaw.json"

if (Test-Path $configPath) {
    Write-Host "  Config exists, updating..." -ForegroundColor Gray

    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json

        # Add extension
        if (-not $config.extensions) {
            $config | Add-Member -MemberType NoteProperty -Name 'extensions' -Value @{}
        }
        $config.extensions.$ExtensionName = @{
            enabled = $true
            auto_load = $true
        }

        # Add webhook
        if (-not $config.webhooks) {
            $config | Add-Member -MemberType NoteProperty -Name 'webhooks' -Value @{}
        }
        $config.webhooks.on_message = @{
            enabled = $true
            handler = 'webhooks/on_message.js'
            platforms = @('telegram', 'discord', 'slack', 'whatsapp')
        }

        # Save
        $config | ConvertTo-Json -Depth 10 | Set-Content $configPath
        Write-Host "✅ Configuration updated" -ForegroundColor Green

    } catch {
        Write-Host "⚠️  Failed to update config: $_" -ForegroundColor Yellow
        Write-Host "  Please update manually" -ForegroundColor Yellow
    }

} else {
    Write-Host "  Creating new config..." -ForegroundColor Gray

    $newConfig = @{
        extensions = @{
            $ExtensionName = @{
                enabled = $true
                auto_load = $true
            }
        }
        webhooks = @{
            on_message = @{
                enabled = $true
                handler = 'webhooks/on_message.js'
                platforms = @('telegram', 'discord', 'slack', 'whatsapp')
            }
        }
    }

    $newConfig | ConvertTo-Json -Depth 10 | Set-Content $configPath
    Write-Host "✅ Configuration created" -ForegroundColor Green
}

# Step 6: Test installation
Write-Host "`n6️⃣  Testing installation..." -ForegroundColor Yellow

# Check IPC Bridge
Write-Host "  Checking IPC Bridge connection..." -ForegroundColor Gray

try {
    $pingResult = openclaw-dispatch ping 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ IPC Bridge connected" -ForegroundColor Green
    } else {
        Write-Host "⚠️  IPC Bridge not responding" -ForegroundColor Yellow
        Write-Host "  Start with: pnpm --filter ipc-bridge dev" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cannot test IPC Bridge (openclaw-dispatch not found)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📁 Installed Files:" -ForegroundColor Cyan
Write-Host "  Extension:  $OpenClawDir\extensions\$ExtensionName\" -ForegroundColor Gray
Write-Host "  Webhook:    $OpenClawDir\webhooks\on_message.js" -ForegroundColor Gray
Write-Host "  Config:     $OpenClawDir\openclaw.json`n" -ForegroundColor Gray

Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start IPC Bridge:" -ForegroundColor Yellow
Write-Host "     pnpm --filter ipc-bridge dev`n" -ForegroundColor Gray

Write-Host "  2. Test the extension:" -ForegroundColor Yellow
Write-Host "     Send: /mcp filesystem list_directory {`"path`":`"./`"}" -ForegroundColor Gray
Write-Host "     Or:   /files" -ForegroundColor Gray
Write-Host "     Or:   /search vibetech`n" -ForegroundColor Gray

Write-Host "  3. View logs:" -ForegroundColor Yellow
Write-Host "     $OpenClawDir\logs\`n" -ForegroundColor Gray

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Integration Guide: INTEGRATION_GUIDE.md" -ForegroundColor Gray
Write-Host "  Examples README:   README.md`n" -ForegroundColor Gray

Write-Host "Happy coding! 🎉" -ForegroundColor Green
