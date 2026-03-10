# VS Code Extension Cleanup Script
# Run from PowerShell: .\Remove-DuplicateExtensions.ps1

param(
    [switch]$DryRun = $false,
    [switch]$SkipAzure = $false,
    [switch]$SkipAI = $false
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== VS Code Extension Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Duplicate extensions (older versions)
$duplicates = @(
    "github.copilot-1.372.0",
    "dbaeumer.vscode-eslint-3.0.16",
    "teamsdevapp.vscode-ai-foundry-0.12.3",
    "ms-python.flake8-2025.2.0"
)

# 2. Unused AI assistants (keeping Claude, Copilot, Continue, ChatGPT, Codex)
$aiToRemove = @(
    "augment.vscode-augment",
    "google.geminicodeassist",
    "bini.ai-resolver",
    "boonboonsiri.gemini-autocomplete",
    "ktiays.aicursor",
    "tdd-with-gpt.tdd-with-gpt"
)

# 3. Python linting - consolidate to Ruff only
$pythonLinters = @(
    "ms-python.flake8",
    "ms-python.black-formatter",
    "ms-python.isort",
    "ms-python.pylint",
    "ms-python.mypy-type-checker"
)

# 4. Azure extensions
$azureExtensions = @(
    "ms-azuretools.azure-dev",
    "ms-azuretools.vscode-azureappservice",
    "ms-azuretools.vscode-azurecontainerapps",
    "ms-azuretools.vscode-azurefunctions",
    "ms-azuretools.vscode-azure-github-copilot",
    "ms-azuretools.vscode-azure-mcp-server",
    "ms-azuretools.vscode-azureresourcegroups",
    "ms-azuretools.vscode-azurestaticwebapps",
    "ms-azuretools.vscode-azurestorage",
    "ms-azuretools.vscode-azureterraform",
    "ms-azuretools.vscode-azurevirtualmachines",
    "ms-azuretools.vscode-cosmosdb",
    "ms-vscode.vscode-node-azure-pack",
    "ms-azure-load-testing.microsoft-testing"
)

# 5. SQLite viewers - keep qwtel.sqlite-viewer only
$sqliteViewers = @(
    "alexcvzz.vscode-sqlite",
    "juangerardomedellinibarra.sqlite-viewer-browser",
    "yy0931.vscode-sqlite3-editor",
    "rohit-chouhan.sqlite-snippet"
)

# 6. Redundant formatters
$redundantFormatters = @(
    "mblode.pretty-formatter",
    "mohsen1.prettify-json",
    "lyngai.vscode-eslint-ts-fix",
    "exceptionptr.vscode-prettier-eslint",
    "rvest.vs-code-prettier-eslint"
)

# Build list based on flags
$allToUninstall = $duplicates + $pythonLinters + $sqliteViewers + $redundantFormatters

if (-not $SkipAI) {
    $allToUninstall += $aiToRemove
}

if (-not $SkipAzure) {
    $allToUninstall += $azureExtensions
}

Write-Host "Extensions to remove: $($allToUninstall.Count)" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would uninstall:" -ForegroundColor Magenta
    $allToUninstall | ForEach-Object { Write-Host "  - $_" }
    return
}

$success = 0
$skipped = 0

foreach ($ext in $allToUninstall) {
    Write-Host "Removing: $ext" -ForegroundColor Gray -NoNewline
    $null = code --uninstall-extension $ext 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
        $success++
    } else {
        Write-Host " [SKIP]" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "Removed: $success"
Write-Host "Skipped: $skipped (not installed or already removed)"
Write-Host ""
Write-Host "Restart VS Code to apply changes." -ForegroundColor Cyan
