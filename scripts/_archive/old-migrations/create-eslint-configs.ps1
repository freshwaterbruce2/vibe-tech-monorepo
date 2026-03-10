# Create .eslintrc.cjs files for all TypeScript projects in the monorepo
# Fixes: "No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present"

$ErrorActionPreference = "Stop"

function Create-EslintConfig {
    param(
        [string]$ProjectPath,
        [string]$ProjectName
    )

    # Find all tsconfig*.json files in the project
    $tsconfigFileNames = @()
    Get-ChildItem -Path $ProjectPath -Filter "tsconfig*.json" -File | ForEach-Object {
        $tsconfigFileNames += $_.Name
    }

    if ($tsconfigFileNames.Count -eq 0) {
        Write-Warning "No tsconfig files found in $ProjectPath"
        return
    }

    # Build project array manually
    $projectArray = ($tsconfigFileNames | ForEach-Object { "'./'" + $_ + "'" }) -join ', '

    # Write to .eslintrc.cjs
    $eslintConfigPath = Join-Path $ProjectPath ".eslintrc.cjs"

    # Write file line by line
    @(
        "// ESLint configuration for $ProjectName",
        "// Overrides monorepo root config to set correct tsconfigRootDir",
        "",
        "module.exports = {",
        "  root: false, // Don't stop looking for parent configs",
        "  parserOptions: {",
        "    tsconfigRootDir: __dirname,",
        "    project: [$projectArray]",
        "  }",
        "};"
    ) | Out-File -FilePath $eslintConfigPath -Encoding utf8 -Force

    Write-Host "✓ Created: $eslintConfigPath" -ForegroundColor Green
}

# Process all directories
$directories = @('apps', 'packages', 'backend')
$totalCreated = 0

foreach ($dir in $directories) {
    $dirPath = Join-Path $PSScriptRoot "..\$dir"
    
    if (-not (Test-Path $dirPath)) {
        Write-Warning "Directory not found: $dirPath"
        continue
    }
    
    Write-Host "`n=== Processing $dir ===" -ForegroundColor Cyan
    
    Get-ChildItem -Path $dirPath -Directory | ForEach-Object {
        $projectPath = $_.FullName
        $projectName = $_.Name
        $tsconfigPath = Join-Path $projectPath "tsconfig.json"
        
        if (Test-Path $tsconfigPath) {
            Create-EslintConfig -ProjectPath $projectPath -ProjectName $projectName
            $script:totalCreated++
        }
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Created/Updated: $totalCreated" -ForegroundColor Green
Write-Host "`nDone! ESLint configs created for all TypeScript projects." -ForegroundColor Green

