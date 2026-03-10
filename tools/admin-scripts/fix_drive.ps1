<#
.SYNOPSIS
    Fixes D:\ drive organization and enforces clean hierarchy.
    Handles partial moves and root clutter.

.DESCRIPTION
    Structure Goal:
    D:\Dev
      ├── Repositories
      ├── Users
      │   └── fresh_zxae3v6
      └── Workspace
          ├── deployments
          ├── scripts
          └── ... (loose dev folders)
#>

$root = "D:\"
$devRoot = "D:\Dev"

Write-Host "Starting Organization Fix..." -ForegroundColor Cyan

# 1. Structure Setup (Dev)
$structure = @(
  "D:\Dev\Users",
  "D:\Dev\Repositories",
  "D:\Dev\Workspace"
)

foreach ($path in $structure) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    Write-Host "Created: $path" -ForegroundColor Green
  }
}

# 2. Fix Repositories (Case/Location)
if (Test-Path "D:\Dev\repositories") {
  # If it's the directory we want, just capitalization fix?
  # Windows is case-insensitive, but let's be cleaner if we can.
  # Actually, D:\Dev\Repositories exists now.
  # If D:\Dev\repositories content needs valid move:
  Get-ChildItem "D:\Dev\repositories" | Move-Item -Destination "D:\Dev\Repositories" -Force
  Remove-Item "D:\Dev\repositories" -Force -Recurse -ErrorAction SilentlyContinue
  Write-Host "Consolidated Repositories" -ForegroundColor Green
}

# 3. Fix Users (fresh_zxae3v6)
# Check Root
if (Test-Path "D:\fresh_zxae3v6") {
  Write-Host "Moving D:\fresh_zxae3v6 to Users..."
  Move-Item -Path "D:\fresh_zxae3v6" -Destination "D:\Dev\Users" -Force -ErrorAction SilentlyContinue
}
# Check inside Dev (if incorrectly placed at D:\Dev\fresh_zxae3v6)
if (Test-Path "D:\Dev\fresh_zxae3v6") {
  Write-Host "Moving D:\Dev\fresh_zxae3v6 to Users..."
  Move-Item -Path "D:\Dev\fresh_zxae3v6" -Destination "D:\Dev\Users" -Force -ErrorAction SilentlyContinue
}

# 4. Clean Root Clutter -> D:\Dev\Workspace
# List of loose folders identified in D:\ root to be moved to Workspace
$workspaceFolders = @(
  "deployments",
  "cache",
  "config",
  "custom",
  "scripts",
  "walmart_organized",
  "windows",
  "_build",
  "MapData",
  "VibeJusticeData",
  ".trading_bot",
  ".vscode"
)

foreach ($folder in $workspaceFolders) {
  $source = Join-Path $root $folder
  if (Test-Path $source) {
    Write-Host "Moving $folder to Workspace..."
    Move-Item -Path $source -Destination "D:\Dev\Workspace" -Force
  }
}

# 5. Move original 'config.yaml' in D:\Dev to Workspace (cleanup D:\Dev root)
if (Test-Path "D:\Dev\config.yaml") {
  Move-Item "D:\Dev\config.yaml" "D:\Dev\Workspace" -Force
}

# 6. Final Root Cleanup Check
Write-Host "`nFinal Root Check:"
Get-ChildItem $root -Directory | Select-Object Name

Write-Host "`nFix Complete!" -ForegroundColor Cyan
