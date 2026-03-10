<#
.SYNOPSIS
    Initialize a project for Vibe Finisher
.DESCRIPTION
    Sets up the finisher configuration for a target project.
    Creates project-specific scratchpad and analyzes initial state.
.EXAMPLE
    .\init.ps1 -TargetProject "C:\dev\apps\vibe-tutor"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetProject,
    
    [string]$BackupDir = "C:\dev\_backups"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== VIBE FINISHER INIT ===" -ForegroundColor Cyan

# Validate target
if (-not (Test-Path $TargetProject)) {
    Write-Error "Target project not found: $TargetProject"
    exit 1
}

$projectName = Split-Path -Leaf $TargetProject
Write-Host "Initializing finisher for: $projectName" -ForegroundColor Yellow

# Update config
$configPath = Join-Path $ScriptDir "finisher.yaml"
$config = Get-Content $configPath -Raw
$config = $config -replace 'targetProject:.*', "targetProject: $TargetProject"
$config = $config -replace 'backupDir:.*', "backupDir: $BackupDir"
$config | Set-Content $configPath
Write-Host "[OK] Updated finisher.yaml" -ForegroundColor Green

# Create backup before anything
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupPath = Join-Path $BackupDir "${projectName}_pre-finisher_$timestamp.zip"
Write-Host "[BACKUP] Creating safety backup..." -ForegroundColor Yellow
Compress-Archive -Path $TargetProject -DestinationPath $backupPath -Force
Write-Host "[OK] Backup: $backupPath" -ForegroundColor Green

# Analyze project
Write-Host "`n[ANALYZING] Project structure..." -ForegroundColor Cyan

$analysis = @{
    Name = $projectName
    Path = $TargetProject
    Timestamp = Get-Date -Format 'o'
    HasPackageJson = Test-Path (Join-Path $TargetProject "package.json")
    HasTsConfig = Test-Path (Join-Path $TargetProject "tsconfig.json")
    HasSrc = Test-Path (Join-Path $TargetProject "src")
    HasDist = Test-Path (Join-Path $TargetProject "dist")
    HasNodeModules = Test-Path (Join-Path $TargetProject "node_modules")
}

# Check for common project types
if ($analysis.HasPackageJson) {
    $pkg = Get-Content (Join-Path $TargetProject "package.json") | ConvertFrom-Json
    $analysis.ProjectType = if ($pkg.dependencies.electron) { "Electron" }
                           elseif ($pkg.dependencies.react) { "React" }
                           elseif ($pkg.dependencies.next) { "Next.js" }
                           elseif ($pkg.dependencies.vue) { "Vue" }
                           else { "Node.js" }
    $analysis.Scripts = ($pkg.scripts | Get-Member -MemberType NoteProperty).Name -join ", "
}

# Check TypeScript errors
if ($analysis.HasTsConfig) {
    Write-Host "[CHECK] Running TypeScript check..." -ForegroundColor Gray
    Push-Location $TargetProject
    try {
        $tscOutput = & npx tsc --noEmit 2>&1
        $analysis.TypeScriptErrors = ($tscOutput | Select-String "error TS").Count
    }
    catch {
        $analysis.TypeScriptErrors = "Could not run tsc"
    }
    Pop-Location
}

# Initialize scratchpad with analysis
$scratchpad = Join-Path $ScriptDir "scratchpad"
if (-not (Test-Path $scratchpad)) {
    New-Item -ItemType Directory -Path $scratchpad | Out-Null
}

# Write status
$statusContent = @"
# Project Status: $projectName

## Overview
- **Path**: $TargetProject
- **Type**: $($analysis.ProjectType)
- **Analyzed**: $(Get-Date -Format 'yyyy-MM-dd HH:mm')

## Structure
- package.json: $(if ($analysis.HasPackageJson) { "✅" } else { "❌" })
- tsconfig.json: $(if ($analysis.HasTsConfig) { "✅" } else { "❌" })
- src/: $(if ($analysis.HasSrc) { "✅" } else { "❌" })
- dist/: $(if ($analysis.HasDist) { "✅" } else { "❌" })
- node_modules/: $(if ($analysis.HasNodeModules) { "✅" } else { "❌ (run npm install)" })

## TypeScript Errors
$($analysis.TypeScriptErrors)

## Available Scripts
$($analysis.Scripts)

## Ship Status
NOT YET STARTED
"@
$statusContent | Set-Content (Join-Path $scratchpad "status.md")

# Write initial TODO
$todoContent = @"
# TODO: $projectName

## Phase 1: Build Stability
- [ ] Ensure npm install works
- [ ] Fix all TypeScript errors
- [ ] Ensure npm run build succeeds

## Phase 2: Launch Check
- [ ] App launches without crash
- [ ] No console errors on startup
- [ ] Basic navigation works

## Phase 3: Core Features
- [ ] Identify core features from README/docs
- [ ] Verify each core feature works
- [ ] Fix any broken features

## Phase 4: Package
- [ ] Build produces distributable
- [ ] Installer/exe works
- [ ] App runs from installed location

## Blockers
(None identified yet)
"@
$todoContent | Set-Content (Join-Path $scratchpad "todo.md")

# Write changelog
$changelogContent = @"
# Changelog: $projectName

## $(Get-Date -Format 'yyyy-MM-dd')

### Session Start
- Vibe Finisher initialized
- Initial backup created: $backupPath
- TypeScript errors found: $($analysis.TypeScriptErrors)
"@
$changelogContent | Set-Content (Join-Path $scratchpad "changelog.md")

Write-Host "`n[OK] Scratchpad initialized" -ForegroundColor Green

# Summary
Write-Host "`n" -NoNewline
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  INITIALIZATION COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Project: $projectName" -ForegroundColor White
Write-Host "  Type: $($analysis.ProjectType)" -ForegroundColor White
Write-Host "  TS Errors: $($analysis.TypeScriptErrors)" -ForegroundColor $(if ($analysis.TypeScriptErrors -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Backup: $backupPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    1. Review scratchpad\status.md" -ForegroundColor White
Write-Host "    2. Run .\sync.ps1 for single pass" -ForegroundColor White
Write-Host "    3. Run .\ralph.ps1 for infinite loop" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
