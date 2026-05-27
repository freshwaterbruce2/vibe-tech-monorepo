# Desktop OpenClaw Setup (Tailscale) — One-Time Script
# Run this in PowerShell as Administrator

$ErrorActionPreference = "Stop"
Write-Host "=== OpenClaw Desktop Gateway + Node Setup ===" -ForegroundColor Cyan

# ─── 1. Check prerequisites ───────────────────────────────────────────
Write-Host "`n[1/6] Checking prerequisites..." -ForegroundColor Yellow

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org/ then re-run." -ForegroundColor Red
    exit 1
}

$nodeVersion = (node --version).Trim()
Write-Host "  Node.js: $nodeVersion"

$ts = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $ts) {
    Write-Host "WARNING: Tailscale CLI not found. Install Tailscale first." -ForegroundColor Red
    exit 1
}
Write-Host "  Tailscale: OK"

# ─── 2. Install OpenClaw ──────────────────────────────────────────────
Write-Host "`n[2/6] Installing OpenClaw..." -ForegroundColor Yellow

$openclaw = Get-Command openclaw -ErrorAction SilentlyContinue
if (-not $openclaw) {
    pnpm add -g openclaw
} else {
    Write-Host "  OpenClaw already installed: $((openclaw --version).Trim())"
}

# ─── 3. Get Tailscale IP ──────────────────────────────────────────────
Write-Host "`n[3/6] Detecting Tailscale IP..." -ForegroundColor Yellow

$tsIp = (tailscale ip -4).Trim()
if (-not $tsIp) {
    Write-Host "ERROR: No Tailscale IPv4 found. Is Tailscale connected?" -ForegroundColor Red
    exit 1
}
Write-Host "  Tailscale IP: $tsIp"

# ─── 4. Configure Gateway ─────────────────────────────────────────────
Write-Host "`n[4/6] Configuring Gateway..." -ForegroundColor Yellow

$token = "vibe_dt_$(Get-Random -Maximum 999999)_$(Get-Random -Maximum 999999)"

openclaw config set gateway.bind loopback
openclaw config set gateway.auth.token $token
openclaw config set gateway.tailscale.mode serve

Write-Host "  Token set (save this): $token"
Write-Host "  Gateway will advertise via Tailscale"

# ─── 5. Install Node Host as Windows Service ──────────────────────────
Write-Host "`n[5/6] Installing Desktop Node Host service..." -ForegroundColor Yellow

$env:OPENCLAW_GATEWAY_TOKEN = $token
openclaw node install --host 127.0.0.1 --port 18789 --display-name "Desktop-Exec-Node" --force
openclaw node restart

# ─── 6. Restart Gateway + Verify ──────────────────────────────────────
Write-Host "`n[6/6] Restarting Gateway and verifying..." -ForegroundColor Yellow

openclaw gateway restart
Start-Sleep -Seconds 3

Write-Host "`n=== Verification ===" -ForegroundColor Green
Write-Host "Gateway status:"
openclaw status | Select-String -Pattern "Gateway|Tailscale|Node" | ForEach-Object { "  $_" }

Write-Host "`nNode status:"
openclaw nodes status 2>$null | ForEach-Object { "  $_" }

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "`nTailscale IP: $tsIp"
Write-Host "Gateway URL: ws://$($tsIp):18789"
Write-Host "Token: $token"
Write-Host "`nEnter these in the Kimi Claw app on your phone."
Write-Host "Then run: openclaw devices approve --latest"

# Save config to file for reference
$configPath = "$env:USERPROFILE\.openclaw\phone-gateway.json"
@{
    tailscaleIp = $tsIp
    gatewayUrl = "ws://$($tsIp):18789"
    token = $token
    setupDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json | Set-Content $configPath

Write-Host "`nConfig saved to: $configPath"
