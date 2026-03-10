#!/usr/bin/env pwsh
# Quick test installation script

$ErrorActionPreference = 'Stop'

$openclawDir = Join-Path $env:USERPROFILE '.openclaw'
$source = 'C:\dev\packages\openclaw-bridge\examples'

Write-Host "Installing to: $openclawDir" -ForegroundColor Cyan

# Create directories
$dirs = @(
    "$openclawDir\extensions\vibetech-bridge\commands",
    "$openclawDir\webhooks",
    "$openclawDir\logs"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir" -ForegroundColor Green
    }
}

# Copy extension files
Write-Host "`nCopying extension files..." -ForegroundColor Yellow
Copy-Item "$source\extension\manifest.json" "$openclawDir\extensions\vibetech-bridge\" -Force
Copy-Item "$source\extension\index.js" "$openclawDir\extensions\vibetech-bridge\" -Force
Copy-Item "$source\extension\commands\*.js" "$openclawDir\extensions\vibetech-bridge\commands\" -Force

# Copy webhook
Write-Host "Copying webhook..." -ForegroundColor Yellow
Copy-Item "$source\webhook-handler.js" "$openclawDir\webhooks\on_message.js" -Force

# Verify
Write-Host "`n=== Installation Verification ===" -ForegroundColor Cyan
Write-Host "`nExtension files:" -ForegroundColor Yellow
Get-ChildItem "$openclawDir\extensions\vibetech-bridge" -Recurse -File | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Gray }

Write-Host "`nWebhook:" -ForegroundColor Yellow
if (Test-Path "$openclawDir\webhooks\on_message.js") {
    Write-Host "  ✅ on_message.js" -ForegroundColor Green
} else {
    Write-Host "  ❌ on_message.js missing" -ForegroundColor Red
}

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
