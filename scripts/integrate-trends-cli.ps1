# Requires -Version 7.0
# ==============================================================================
# VibeTech Workspace - DB Trends CLI & MCP Integration Script
# Automates mapping the 'view-db-trends.ps1' script to pnpm workspace scripts
# and registers it as an active tool inside the universal .mcp.json.
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configuration paths
$packageJsonPath = "package.json"
$mcpConfigPath = ".mcp.json"
$targetScriptPath = "scripts/view-db-trends.ps1"

Write-Host "Starting CLI & MCP database trend integration..." -ForegroundColor Cyan

# 1. Verify target script exists
if (-not (Test-Path $targetScriptPath)) {
    if (Test-Path "view-db-trends.ps1") {
        New-Item -ItemType Directory -Path "scripts" -Force | Out-Null
        Copy-Item -Path "view-db-trends.ps1" -Destination $targetScriptPath -Force
        Write-Host "Moved view-db-trends.ps1 to scripts/ subfolder." -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Warning: Could not locate view-db-trends.ps1. Ensure it is placed in the scripts/ directory." -ForegroundColor Yellow
    }
}

# 2. Update package.json scripts
if (Test-Path $packageJsonPath) {
    try {
        Write-Host "Updating $packageJsonPath to map 'pnpm run db:trends'..." -ForegroundColor Gray
        $pkgContent = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
        
        # Add scripts if not already present
        if (-not $pkgContent.scripts) {
            $pkgContent | Add-Member -MemberType NoteProperty -Name "scripts" -Value ([PSCustomObject]@{ })
        }
        
        # Inject our trend scripts
        $pkgContent.scripts | Add-Member -MemberType NoteProperty -Name "db:trends" -Value "pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/view-db-trends.ps1" -Force
        
        # Write back pretty-printed
        $pkgContent | ConvertTo-Json -Depth 100 | Set-Content -Path $packageJsonPath
        Write-Host "✅ Successfully mapped 'pnpm run db:trends' in package.json." -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update package.json: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ package.json not found at the current path. Skipping package mapping." -ForegroundColor Yellow
}

# 3. Update .mcp.json configurations
if (Test-Path $mcpConfigPath) {
    try {
        Write-Host "Injecting trend tool mapping into universal $mcpConfigPath..." -ForegroundColor Gray
        $mcpContent = Get-Content -Path $mcpConfigPath -Raw | ConvertFrom-Json
        
        $toolRegistryFound = $false
        
        if ($mcpContent.mcpServers) {
            # Check for a 'storage-learning-server' and create if missing
            $storageServer = $mcpContent.mcpServers."storage-learning-server"
            if (-not $storageServer) {
                $storageServer = [PSCustomObject]@{
                    type = "stdio"
                    command = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
                    args = @(
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-File",
                        "V:/monorepo/scripts/view-db-trends.ps1"
                    )
                    tools = @()
                }
                $mcpContent.mcpServers | Add-Member -MemberType NoteProperty -Name "storage-learning-server" -Value $storageServer -Force
            }
            
            # Ensure tools array exists
            if (-not $storageServer.tools) {
                $storageServer | Add-Member -MemberType NoteProperty -Name "tools" -Value @() -Force
            }
            
            # Check if tool already mapped
            $existing = $storageServer.tools | Where-Object { $_.name -eq "view_database_trends" }
            if (-not $existing) {
                $newTool = [PSCustomObject]@{
                    name = "view_database_trends"
                    description = "Generates a 7-day terminal ASCII chart tracking SQLite size trends, deltas, and 30-day capacity projections across stateful D:\ databases."
                    inputSchema = [PSCustomObject]@{
                        type = "object"
                        properties = [PSCustomObject]@{ }
                    }
                }
                $storageServer.tools += $newTool
                $toolRegistryFound = $true
            }
        }
        
        if ($toolRegistryFound) {
            $mcpContent | ConvertTo-Json -Depth 100 | Set-Content -Path $mcpConfigPath
            Write-Host "✅ Registered 'view_database_trends' tool inside universal .mcp.json." -ForegroundColor Green
        } else {
            Write-Host "ℹ️ MCP 'storage-learning-server' already configured with view_database_trends." -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️ Unable to parse or update .mcp.json: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ Universal .mcp.json not present at root. Skipping MCP registration." -ForegroundColor Gray
}

Write-Host "`nCLI & MCP integration sequence complete. You can now execute 'pnpm run db:trends'!" -ForegroundColor Green
