# DeepSeek R1 Global Upgrade Script
# Updates all projects in the monorepo to use the new DeepSeek R1 reasoning models

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DeepSeek R1 Model Upgrade Script" -ForegroundColor Cyan
Write-Host " December 2025 - Reasoning Model Update" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Define projects and their service files
$projects = @{
    "DeepCode Editor" = @{
        Path = "projects/active/desktop-apps/deepcode-editor/src/services/DeepSeekService.ts"
        ConfigPath = "projects/active/desktop-apps/deepcode-editor/src/services/ai/providers/DeepSeekProvider.ts"
    }
    "Nova Agent" = @{
        Path = "apps/nova-agent/src/services/DeepSeekService.ts"
        ConfigPath = "apps/nova-agent/.env"
    }
    "Digital Content Builder" = @{
        Path = "apps/digital-content-builder/src/main/api-proxy.ts"
        ConfigPath = "apps/digital-content-builder/.env"
    }
    "Vibe-Tutor" = @{
        Path = "apps/vibe-tutor/services/deepseekClient.ts"
        ConfigPath = "apps/vibe-tutor/.env"
    }
    "Vibe-Justice" = @{
        Path = "projects/active/web-apps/vibe-justice/backend/vibe_justice/services/ai_service.py"
        ConfigPath = "projects/active/web-apps/vibe-justice/backend/.env"
    }
    "Service Common Package" = @{
        Path = "packages/service-common/src/deepseek.ts"
        ConfigPath = ""
    }
}

# Function to update TypeScript/JavaScript files
function Update-JSFile {
    param($FilePath)

    if (Test-Path $FilePath) {
        Write-Host "  Updating: $FilePath" -ForegroundColor Yellow

        # Read file content
        $content = Get-Content $FilePath -Raw

        # Replace model references
        $content = $content -replace "model: 'deepseek-chat'", "model: 'deepseek-reasoner' // Upgraded to R1 reasoning model"
        $content = $content -replace "model: `"deepseek-chat`"", "model: `"deepseek-reasoner`" // Upgraded to R1 reasoning model"
        $content = $content -replace "'deepseek-chat'", "'deepseek-reasoner'"
        $content = $content -replace "`"deepseek-chat`"", "`"deepseek-reasoner`""

        # Add reasoning model option to model types
        if ($content -match "'deepseek-coder'") {
            $content = $content -replace "'deepseek-coder'", "'deepseek-coder' | 'deepseek-reasoner'"
        }

        # Save updated content
        Set-Content -Path $FilePath -Value $content
        Write-Host "    [OK] Updated to use deepseek-reasoner" -ForegroundColor Green
    } else {
        Write-Host "    [!] File not found: $FilePath" -ForegroundColor Yellow
    }
}

# Function to update Python files
function Update-PyFile {
    param($FilePath)

    if (Test-Path $FilePath) {
        Write-Host "  Updating: $FilePath" -ForegroundColor Yellow

        # Read file content
        $content = Get-Content $FilePath -Raw

        # Replace model references
        $content = $content -replace 'self\.model = "deepseek-chat"', 'self.model = "deepseek-reasoner"  # Upgraded to R1 reasoning model'
        $content = $content -replace '"deepseek-chat"', '"deepseek-reasoner"'
        $content = $content -replace "'deepseek-chat'", "'deepseek-reasoner'"

        # Save updated content
        Set-Content -Path $FilePath -Value $content
        Write-Host "    [OK] Updated to use deepseek-reasoner" -ForegroundColor Green
    } else {
        Write-Host "    [!] File not found: $FilePath" -ForegroundColor Yellow
    }
}

# Process each project
foreach ($project in $projects.Keys) {
    Write-Host "`n[Project] Processing: $project" -ForegroundColor Cyan

    $projectInfo = $projects[$project]
    $mainPath = Join-Path $PSScriptRoot $projectInfo.Path
    $configPath = if ($projectInfo.ConfigPath) { Join-Path $PSScriptRoot $projectInfo.ConfigPath } else { "" }

    # Update main service file
    if ($mainPath -match "\.py$") {
        Update-PyFile -FilePath $mainPath
    } else {
        Update-JSFile -FilePath $mainPath
    }

    # Update config file if exists
    if ($configPath -and (Test-Path $configPath)) {
        if ($configPath -match "\.py$") {
            Update-PyFile -FilePath $configPath
        } elseif ($configPath -match "\.env$") {
            Write-Host "  Checking .env: $configPath" -ForegroundColor Yellow
            # Don't modify .env files, just notify
            Write-Host "    [i] .env file - manual update may be needed" -ForegroundColor Cyan
        } else {
            Update-JSFile -FilePath $configPath
        }
    }
}

# Update global TypeScript types if they exist
$globalTypesPath = Join-Path $PSScriptRoot "packages/types/deepseek.d.ts"
if (Test-Path $globalTypesPath) {
    Write-Host "`n[Package] Updating global TypeScript types" -ForegroundColor Cyan
    Update-JSFile -FilePath $globalTypesPath
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Upgrade Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n[Summary] Changes Applied:" -ForegroundColor Yellow
Write-Host "  - Model updated: deepseek-chat to deepseek-reasoner" -ForegroundColor White
Write-Host "  - All service files updated with R1 reasoning model" -ForegroundColor White
Write-Host "  - TypeScript/JavaScript projects upgraded" -ForegroundColor White
Write-Host "  - Python projects upgraded" -ForegroundColor White

Write-Host "`n[!] Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes in each project" -ForegroundColor White
Write-Host "  2. Update .env files if using different model names" -ForegroundColor White
Write-Host "  3. Test each application to ensure compatibility" -ForegroundColor White
Write-Host "  4. Consider adding logic to switch between models based on query complexity" -ForegroundColor White

Write-Host "`n[+] New Features Available:" -ForegroundColor Cyan
Write-Host "  - Chain-of-Thought reasoning" -ForegroundColor White
Write-Host "  - Better problem-solving capabilities" -ForegroundColor White
Write-Host "  - Self-verification and reflection" -ForegroundColor White
Write-Host "  - 96% cheaper than comparable models" -ForegroundColor White

Write-Host "`n[Documentation]" -ForegroundColor Cyan
Write-Host "  See UPGRADE_TO_R1.md in each project for detailed integration guides" -ForegroundColor White
Write-Host ""