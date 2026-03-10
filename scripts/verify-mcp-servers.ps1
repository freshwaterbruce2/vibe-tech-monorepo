#!/usr/bin/env pwsh
# MCP Server Verification Script
# Tests all configured MCP servers

Write-Host "===== MCP Server Verification =====" -ForegroundColor Cyan
Write-Host ""

# Check Node.js and npm
Write-Host "1. Checking Node.js environment..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "   npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# Check Python
Write-Host "2. Checking Python environment..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "   Python: $pythonVersion" -ForegroundColor Green
Write-Host ""

# Check globally installed MCP servers
Write-Host "3. Checking globally installed MCP servers..." -ForegroundColor Yellow
$mcpServers = @(
    "@modelcontextprotocol/server-filesystem",
    "@playwright/mcp",
    "mcp-server-sqlite-npx",
    "nx-mcp"
)

foreach ($server in $mcpServers) {
    $installed = npm list -g $server 2>&1 | Select-String -Pattern $server
    if ($installed) {
        Write-Host "   [OK] $server" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $server" -ForegroundColor Red
    }
}
Write-Host ""

# Check .mcp.json configuration
Write-Host "4. Checking .mcp.json configuration..." -ForegroundColor Yellow
$mcpConfigPath = "C:\dev\.mcp.json"
if (Test-Path $mcpConfigPath) {
    Write-Host "   [OK] .mcp.json exists" -ForegroundColor Green
    $config = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
    Write-Host "   Configured servers:" -ForegroundColor Cyan
    foreach ($server in $config.mcpServers.PSObject.Properties.Name) {
        Write-Host "     - $server" -ForegroundColor Gray
    }
} else {
    Write-Host "   [ERROR] .mcp.json not found" -ForegroundColor Red
}
Write-Host ""

# Check critical directories
Write-Host "5. Checking critical directories..." -ForegroundColor Yellow
$directories = @(
    "C:\dev",
    "C:\dev\apps",
    "C:\dev\packages",
    "C:\dev\backend",
    "D:\databases",
    "D:\logs",
    "D:\learning-system"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "   [OK] $dir" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $dir" -ForegroundColor Red
    }
}
Write-Host ""

# Check database files
Write-Host "6. Checking database files..." -ForegroundColor Yellow
$databases = @(
    "D:\databases\database.db",
    "D:\databases\crypto-enhanced\trading.db"
)

foreach ($db in $databases) {
    if (Test-Path $db) {
        $size = (Get-Item $db).Length / 1KB
        Write-Host "   [OK] $db ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "   [MISSING] $db" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check Python MCP script
Write-Host "7. Checking Python MCP scripts..." -ForegroundColor Yellow
$pythonScript = "C:\dev\tools\deepseek_hands.py"
if (Test-Path $pythonScript) {
    Write-Host "   [OK] deepseek_hands.py exists" -ForegroundColor Green
} else {
    Write-Host "   [MISSING] deepseek_hands.py" -ForegroundColor Red
}
Write-Host ""

Write-Host "===== Verification Complete =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Claude Code to load the updated .mcp.json" -ForegroundColor White
Write-Host "2. Check MCP tools are available in Claude Code" -ForegroundColor White
Write-Host "3. If issues persist, check Claude Code logs" -ForegroundColor White
Write-Host ""
