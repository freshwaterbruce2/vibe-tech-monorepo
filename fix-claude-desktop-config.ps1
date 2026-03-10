# Fix Claude Desktop MCP Server Configuration
# Fixes npx.cmd paths and malformed PATH environment variable

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$backupPath = "$env:APPDATA\Claude\claude_desktop_config.json.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Fixing Claude Desktop MCP configuration..." -ForegroundColor Cyan

# Create backup
Copy-Item $configPath $backupPath
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Read config
$config = Get-Content $configPath -Raw | ConvertFrom-Json

# Fix 1: Update npx.cmd paths
$correctNpxPath = "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\npx.cmd"
Write-Host "`nFixing npx.cmd paths..." -ForegroundColor Yellow

$npxServers = @('filesystem', 'nx-mcp', 'sqlite', 'sqlite-trading', 'playwright')
foreach ($server in $npxServers) {
    if ($config.mcpServers.$server) {
        $oldPath = $config.mcpServers.$server.command
        $config.mcpServers.$server.command = $correctNpxPath
        Write-Host "  $server`: $oldPath → $correctNpxPath" -ForegroundColor Gray
    }
}

# Fix 2: Clean up malformed PATH in all servers
Write-Host "`nFixing malformed PATH environment variable..." -ForegroundColor Yellow

foreach ($serverName in $config.mcpServers.PSObject.Properties.Name) {
    $server = $config.mcpServers.$serverName
    if ($server.env.PATH) {
        # Remove leading single quote if present
        $oldPath = $server.env.PATH
        $newPath = $oldPath -replace "^'", ""

        if ($oldPath -ne $newPath) {
            $server.env.PATH = $newPath
            Write-Host "  $serverName`: Removed leading quote" -ForegroundColor Gray
        }
    }
}

# Save fixed config
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
Write-Host "`n✓ Configuration fixed and saved" -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Restart Claude Desktop" -ForegroundColor White
Write-Host "2. Check if MCP servers connect successfully" -ForegroundColor White
Write-Host "`nIf issues persist, restore backup:" -ForegroundColor Yellow
Write-Host "  Copy-Item '$backupPath' '$configPath'" -ForegroundColor Gray
