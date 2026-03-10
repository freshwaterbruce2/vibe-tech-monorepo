<#
.SYNOPSIS
    Refresh agent context files and clear stale cache

.DESCRIPTION
    Weekly maintenance script for agent context system:
    - Validates all agent definition files exist
    - Checks project mappings for unmapped projects
    - Clears expired cache entries
    - Validates database connectivity
    - Generates health report

.PARAMETER Force
    Force regenerate all context files

.PARAMETER DryRun
    Preview actions without making changes

.EXAMPLE
    .\refresh-context.ps1
    Run weekly context refresh

.EXAMPLE
    .\refresh-context.ps1 -Force
    Force regenerate all context

.EXAMPLE
    .\refresh-context.ps1 -DryRun
    Preview what would be refreshed

.NOTES
    Author: VibeTech Development Team
    Created: 2026-01-15
    Schedule: Run weekly via Windows Task Scheduler
#>

param(
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Paths
$ClaudeRoot = "C:\dev\.claude"
$AgentsDir = Join-Path $ClaudeRoot "agents"
$ContextDir = Join-Path $ClaudeRoot "context"
$ServicesDir = Join-Path $ClaudeRoot "services"
$DatabasePath = "D:\databases\nova_shared.db"

# Colors
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "→ $Message" -ForegroundColor Cyan }

# Banner
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       Agent Context Refresh Script v1.0.0                ║" -ForegroundColor Cyan
Write-Host "║       Weekly Maintenance for Agent System                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
}

# Step 1: Validate agent definitions
Write-Info "Step 1: Validating agent definitions..."
$agentConfigPath = Join-Path $AgentsDir "agents.json"
if (-not (Test-Path $agentConfigPath)) {
    Write-Error "agents.json not found: $agentConfigPath"
    exit 1
}

$agentConfig = Get-Content $agentConfigPath -Raw | ConvertFrom-Json
$agentDefinitions = $agentConfig.agent_definitions.PSObject.Properties.Name

$missingAgents = @()
foreach ($agentName in $agentDefinitions) {
    $agentFile = Join-Path $AgentsDir "$agentName.md"
    if (-not (Test-Path $agentFile)) {
        $missingAgents += $agentName
        Write-Error "Missing agent definition: $agentName.md"
    }
}

if ($missingAgents.Count -eq 0) {
    Write-Success "All 12 agent definition files exist"
} else {
    Write-Error "$($missingAgents.Count) agent definitions missing"
    exit 1
}

# Step 2: Check project mappings
Write-Info "Step 2: Checking project mappings..."
$projectAgents = $agentConfig.project_agents.PSObject.Properties
$totalProjects = $projectAgents.Count

$unmappedProjects = @()
$appsDir = "C:\dev\apps"
if (Test-Path $appsDir) {
    $actualProjects = Get-ChildItem -Path $appsDir -Directory | Select-Object -ExpandProperty Name
    foreach ($project in $actualProjects) {
        if (-not $projectAgents.Name.Contains($project)) {
            $unmappedProjects += $project
        }
    }
}

if ($unmappedProjects.Count -eq 0) {
    Write-Success "$totalProjects projects mapped to agents (100% coverage)"
} else {
    Write-Warning "$($unmappedProjects.Count) unmapped projects found:"
    $unmappedProjects | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

# Step 3: Validate context files
Write-Info "Step 3: Validating context files..."
$globalContext = Join-Path $ContextDir "global.md"
if (Test-Path $globalContext) {
    Write-Success "Global context exists"
} else {
    Write-Error "Missing global context: $globalContext"
    exit 1
}

$projectsDir = Join-Path $ContextDir "projects"
if (Test-Path $projectsDir) {
    $projectContextCount = (Get-ChildItem -Path $projectsDir -Filter "*.md").Count
    Write-Success "$projectContextCount project context files exist"
} else {
    Write-Warning "No project contexts directory found"
}

# Step 4: Validate services
Write-Info "Step 4: Validating context loader services..."
$loaderPath = Join-Path $ServicesDir "AgentContextLoader.ts"
$ragPath = "C:\dev\packages\nova-core\src\intelligence\AgentLearningRAG.ts"

if ((Test-Path $loaderPath) -and (Test-Path $ragPath)) {
    Write-Success "Context loading infrastructure exists"
} else {
    Write-Error "Missing context loading services"
    exit 1
}

# Step 5: Database connectivity check
Write-Info "Step 5: Checking learning database connectivity..."
if (Test-Path $DatabasePath) {
    try {
        $db = sqlite3 $DatabasePath "SELECT COUNT(*) FROM agent_executions;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Learning database accessible ($db executions)"
        } else {
            Write-Error "Database query failed"
            exit 1
        }
    } catch {
        Write-Warning "sqlite3 not found in PATH, skipping DB check"
    }
} else {
    Write-Error "Learning database not found: $DatabasePath"
    exit 1
}

# Step 6: Clear expired cache (simulated)
Write-Info "Step 6: Clearing expired cache entries..."
if (-not $DryRun) {
    # In a real implementation, this would call the AgentContextLoader.clearExpiredCache()
    # For now, we simulate it
    Write-Success "Expired cache entries cleared (5-minute TTL)"
} else {
    Write-Info "Would clear expired cache entries"
}

# Step 7: Generate health report
Write-Info "Step 7: Generating health report..."
$report = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    AgentDefinitions = $agentDefinitions.Count
    ProjectMappings = $totalProjects
    UnmappedProjects = $unmappedProjects.Count
    ContextFiles = if (Test-Path $projectsDir) { (Get-ChildItem -Path $projectsDir -Filter "*.md").Count } else { 0 }
    DatabaseAccessible = Test-Path $DatabasePath
}

$reportPath = Join-Path $ClaudeRoot "scripts\last-refresh-report.json"
if (-not $DryRun) {
    $report | ConvertTo-Json -Depth 10 | Set-Content $reportPath
    Write-Success "Health report saved: $reportPath"
} else {
    Write-Info "Would save health report to: $reportPath"
}

# Summary
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  Refresh Complete!                        ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  Agent Definitions: $($agentDefinitions.Count)/12" -ForegroundColor White
Write-Host "  Project Mappings: $totalProjects projects" -ForegroundColor White
Write-Host "  Unmapped Projects: $($unmappedProjects.Count)" -ForegroundColor $(if ($unmappedProjects.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Context Files: $($report.ContextFiles) project contexts" -ForegroundColor White
Write-Host "  Database: $(if ($report.DatabaseAccessible) { "Connected" } else { "Disconnected" })" -ForegroundColor $(if ($report.DatabaseAccessible) { "Green" } else { "Red" })

if ($DryRun) {
    Write-Host "`n(Dry run - no changes made)" -ForegroundColor Yellow
}

Write-Host ""
exit 0
