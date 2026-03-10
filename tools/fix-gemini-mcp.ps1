# Fix Gemini CLI MCP Configuration
# Resolves ERR_INVALID_URL errors in Gemini CLI

Write-Host "🔧 Fixing Gemini CLI MCP Configuration..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create .gemini directory
Write-Host "[1/3] Creating .gemini directory..." -ForegroundColor Yellow
$geminiDir = "C:\dev\.gemini"
if (!(Test-Path $geminiDir)) {
    New-Item -ItemType Directory -Path $geminiDir -Force | Out-Null
    Write-Host "  ✅ Created: $geminiDir" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Already exists: $geminiDir" -ForegroundColor Cyan
}

# Step 2: Verify MCP server paths
Write-Host ""
Write-Host "[2/3] Verifying MCP server installations..." -ForegroundColor Yellow

$filesystemServer = "C:\Users\fresh_zxae3v6\AppData\Roaming\npm\node_modules\@modelcontextprotocol\server-filesystem\dist\index.js"
$sqliteServer = "C:\Users\fresh_zxae3v6\AppData\Roaming\npm\node_modules\mcp-server-sqlite-npx\dist\index.js"

if (Test-Path $filesystemServer) {
    Write-Host "  ✅ Filesystem MCP server found" -ForegroundColor Green
    $includeFilesystem = $true
} else {
    Write-Host "  ⚠️  Filesystem MCP server not found" -ForegroundColor Yellow
    Write-Host "     Install: npm install -g @modelcontextprotocol/server-filesystem" -ForegroundColor Gray
    $includeFilesystem = $false
}

if (Test-Path $sqliteServer) {
    Write-Host "  ✅ SQLite MCP server found" -ForegroundColor Green
    $includeSqlite = $true
} else {
    Write-Host "  ⚠️  SQLite MCP server not found" -ForegroundColor Yellow
    Write-Host "     Install: npm install -g mcp-server-sqlite-npx" -ForegroundColor Gray
    $includeSqlite = $false
}

# Step 3: Create settings.json
Write-Host ""
Write-Host "[3/3] Creating Gemini settings.json..." -ForegroundColor Yellow

$config = @{
    mcpServers = @{}
    experimental = @{
        enableMcp = $true
    }
}

if ($includeFilesystem) {
    $config.mcpServers.filesystem = @{
        type = "stdio"
        command = "node"
        args = @($filesystemServer, "C:\dev")
    }
}

if ($includeSqlite) {
    $config.mcpServers.sqlite = @{
        type = "stdio"
        command = "node"
        args = @($sqliteServer, "D:\databases\database.db")
    }
}

# Convert to JSON and save
$json = $config | ConvertTo-Json -Depth 10
$settingsPath = "$geminiDir\settings.json"
$json | Out-File -FilePath $settingsPath -Encoding UTF8

Write-Host "  ✅ Created: $settingsPath" -ForegroundColor Green

# Display configuration
Write-Host ""
Write-Host "📄 Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Location: $settingsPath" -ForegroundColor Gray
Write-Host "  MCP Servers Enabled:" -ForegroundColor Gray
if ($includeFilesystem) {
    Write-Host "    - filesystem (file operations in C:\dev)" -ForegroundColor Gray
}
if ($includeSqlite) {
    Write-Host "    - sqlite (D:\databases\database.db)" -ForegroundColor Gray
}
if (!$includeFilesystem -and !$includeSqlite) {
    Write-Host "    - None (no MCP servers installed)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  💡 Consider installing MCP servers:" -ForegroundColor Cyan
    Write-Host "     npm install -g @modelcontextprotocol/server-filesystem" -ForegroundColor Gray
    Write-Host "     npm install -g mcp-server-sqlite-npx" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Gemini CLI MCP configuration fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Test with:" -ForegroundColor Cyan
Write-Host "   cd C:\dev" -ForegroundColor Gray
Write-Host "   gemini chat 'hello'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Debug mode (if issues persist):" -ForegroundColor Cyan
Write-Host "   gemini --debug chat 'test'" -ForegroundColor Gray
