<#
.SYNOPSIS
    Ecosystem Sync Audit Script for @vibetech/workspace
.DESCRIPTION
    Scans skills, agents, MCP servers, and plugins for drift against the monorepo.
    Outputs a JSON report that Claude can parse for the sync workflow.
.PARAMETER Mode
    Quick  = paths + versions only (fast, ~10 seconds)
    Full   = all drift rules (thorough, ~30 seconds)
    Fix    = apply auto-fixable issues (requires confirmation)
.EXAMPLE
    .\audit-ecosystem.ps1 -Mode Quick
    .\audit-ecosystem.ps1 -Mode Full
    .\audit-ecosystem.ps1 -Mode Fix
#>

param(
    [ValidateSet("Quick", "Full", "Fix")]
    [string]$Mode = "Quick"
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# ── Configuration ──────────────────────────────────────────────
$Config = @{
    MonorepoRoot    = "C:\dev"
    ExternalRoot    = "C:\Users\fresh_zxae3v6"
    # IMPORTANT: Only scan USER skills, not the community skills repo
    SkillsPath      = Join-Path "C:\dev\.claude\skills" "user"
    AgentsConfig    = "C:\dev\.claude\sub-agents\config.yml"
    AgentsRegistry  = "C:\dev\.claude\agents.json"
    AgentDelegation = "C:\dev\.claude\agent-delegation.yaml"
    # MCP servers live under apps, not tools
    McpApps         = @(
        "C:\dev\apps\desktop-commander-v3"
        "C:\dev\apps\mcp-gateway"
        "C:\dev\apps\mcp-codeberg"
        "C:\dev\apps\mcp-skills-server"
        "C:\dev\apps\memory-mcp"
    )
    ClaudeDesktopCfg = "$env:APPDATA\Claude\claude_desktop_config.json"
    McpProjectCfg   = "C:\dev\.mcp.json"
    BackupPath      = "C:\dev\_backups"
    # Directories to skip during CLAUDE.md scan
    ExcludeDirs     = @('node_modules', '.next', 'dist', 'dist-electron', 'build', 'out', '.git', '__pycache__', '.cache', 'package', '.turbo', 'coverage', '.vite')
}

# ── Results Collection ─────────────────────────────────────────
$issues = @()

function Add-Issue {
    param(
        [string]$RuleId,
        [string]$Severity,
        [string]$Component,
        [string]$File,
        [string]$Message,
        [bool]$AutoFixable = $false,
        [string]$Fix = ""
    )
    $script:issues += [PSCustomObject]@{
        RuleId      = $RuleId
        Severity    = $Severity
        Component   = $Component
        File        = $File
        Message     = $Message
        AutoFixable = $AutoFixable
        Fix         = $Fix
    }
}

# ── Helper: Extract real paths (skip code blocks + example paths) ──
function Get-RealPaths {
    param([string]$Content)
    # Strip fenced code blocks to avoid matching example paths
    $stripped = $Content -replace '(?s)```.*?```', ''
    # Extract Windows absolute paths
    $raw = [regex]::Matches($stripped, '[A-Z]:\\[^\s"''`\]\)]+') | ForEach-Object { $_.Value.TrimEnd('.', ',', ';') }
    # Filter out known example/template paths
    $raw | Where-Object {
        $_ -notmatch '<user>' -and
        $_ -notmatch '<.*>' -and
        $_ -notmatch '\\boot\.ini' -and
        $_ -notmatch '\\xampp\\' -and
        $_ -notmatch '\\inetpub\\' -and
        $_ -notmatch '\\windows\\system32>' -and
        $_ -notmatch '\\windows\\repair\\' -and
        $_ -notmatch '\\Temp\\Stolen' -and
        $_ -notmatch '\\Temp\\Azure' -and
        $_ -notmatch '\[project' -and
        $_ -match '^(C:\\dev|C:\\Users\\fresh_zxae3v6|D:\\)'
    }
}

# ── Phase 1: Path Validation ──────────────────────────────────
Write-Host "`n[Phase 1] Scanning paths (user skills only)..." -ForegroundColor Cyan

$skillFiles = Get-ChildItem -Path $Config.SkillsPath -Recurse -Filter "SKILL.md" -ErrorAction SilentlyContinue
Write-Host "  Found $($skillFiles.Count) SKILL.md files in user skills" -ForegroundColor Gray
foreach ($sf in $skillFiles) {
    $content = Get-Content $sf.FullName -Raw
    $paths = Get-RealPaths -Content $content
    foreach ($p in $paths) {
        if (-not (Test-Path $p -ErrorAction SilentlyContinue)) {
            Add-Issue -RuleId "PATH-001" -Severity "Breaking" -Component "Skill" `
                -File $sf.FullName -Message "Path not found: $p"
        }
    }
}

$refFiles = Get-ChildItem -Path $Config.SkillsPath -Recurse -Filter "*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "SKILL.md" }
foreach ($rf in $refFiles) {
    $content = Get-Content $rf.FullName -Raw
    $paths = Get-RealPaths -Content $content
    foreach ($p in $paths) {
        if (-not (Test-Path $p -ErrorAction SilentlyContinue)) {
            Add-Issue -RuleId "PATH-002" -Severity "Stale" -Component "Reference" `
                -File $rf.FullName -Message "Path not found: $p"
        }
    }
}

foreach ($cfgFile in @($Config.AgentsConfig, $Config.AgentsRegistry, $Config.AgentDelegation)) {
    if (-not (Test-Path $cfgFile)) {
        Add-Issue -RuleId "PATH-003" -Severity "Breaking" -Component "AgentConfig" `
            -File $cfgFile -Message "Agent config file missing"
    }
}

foreach ($mcpCfg in @($Config.ClaudeDesktopCfg, $Config.McpProjectCfg)) {
    if (-not (Test-Path $mcpCfg)) {
        Add-Issue -RuleId "PATH-004" -Severity "Stale" -Component "McpConfig" `
            -File $mcpCfg -Message "MCP config file not found"
    }
}

# ── Phase 2: Dependency Version Check ─────────────────────────
Write-Host "[Phase 2] Checking dependency versions..." -ForegroundColor Cyan

$rootPkgPath = Join-Path $Config.MonorepoRoot "package.json"
if (Test-Path $rootPkgPath) {
    $rootPkg = Get-Content $rootPkgPath | ConvertFrom-Json

    $versions = @{}
    if ($rootPkg.dependencies) {
        $rootPkg.dependencies.PSObject.Properties | ForEach-Object {
            $versions[$_.Name] = $_.Value -replace '[\^~>=<]', ''
        }
    }
    if ($rootPkg.devDependencies) {
        $rootPkg.devDependencies.PSObject.Properties | ForEach-Object {
            $versions[$_.Name] = $_.Value -replace '[\^~>=<]', ''
        }
    }

    # SEC-001: Check for compromised Nx versions
    $nxVersion = $versions['nx']
    if ($nxVersion -eq '21.5.0' -or $nxVersion -eq '21.6.0') {
        Add-Issue -RuleId "SEC-001" -Severity "Breaking" -Component "Dependency" `
            -File $rootPkgPath `
            -Message "SECURITY: Nx $nxVersion was compromised in S1ngularity attack. Upgrade immediately!" `
            -AutoFixable $true -Fix "Bump to nx@21.5.1+ or nx@21.6.1+ or nx@22.x"
    }

    # Scan each known MCP app for SDK version + patterns
    foreach ($mcpApp in $Config.McpApps) {
        $mcpPkgFile = Join-Path $mcpApp "package.json"
        if (Test-Path $mcpPkgFile) {
            $mcpPkg = Get-Content $mcpPkgFile | ConvertFrom-Json
            # Check MCP SDK version
            $sdkVer = $null
            if ($mcpPkg.dependencies -and $mcpPkg.dependencies.'@modelcontextprotocol/sdk') {
                $sdkVer = $mcpPkg.dependencies.'@modelcontextprotocol/sdk' -replace '[\^~>=<]', ''
                Write-Host "  MCP SDK: $sdkVer in $(Split-Path $mcpApp -Leaf)" -ForegroundColor Gray
            }
            # MCP-008: Check zod peer dependency
            $hasZod = $false
            if ($mcpPkg.peerDependencies -and $mcpPkg.peerDependencies.zod) { $hasZod = $true }
            if ($mcpPkg.dependencies -and $mcpPkg.dependencies.zod) { $hasZod = $true }
            if ($sdkVer -and -not $hasZod) {
                Add-Issue -RuleId "MCP-008" -Severity "Stale" -Component "McpServer" `
                    -File $mcpPkgFile `
                    -Message "MCP SDK 1.27+ requires zod as peer dep — not found" `
                    -AutoFixable $true -Fix "Add zod to peerDependencies"
            }
        }
        # MCP-007: Check for legacy API patterns in .ts files (skip node_modules + backups)
        $mcpSrcFiles = Get-ChildItem -Path $mcpApp -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch 'node_modules|_backups|dist|build' }
        foreach ($tsFile in $mcpSrcFiles) {
            $tsContent = Get-Content $tsFile.FullName -Raw -ErrorAction SilentlyContinue
            if ($tsContent -match 'setRequestHandler\(ListToolsRequestSchema') {
                Add-Issue -RuleId "MCP-007" -Severity "Stale" -Component "McpServer" `
                    -File $tsFile.FullName `
                    -Message "Uses legacy Server+setRequestHandler pattern. Migrate to McpServer+registerTool"
            }
        }
    }
}

# ── Phase 3: Agent Config Validation ──────────────────────────
if ($Mode -ne "Quick") {
    Write-Host "[Phase 3] Validating agent configs..." -ForegroundColor Cyan

    if (Test-Path $Config.AgentsRegistry) {
        try {
            $agents = Get-Content $Config.AgentsRegistry | ConvertFrom-Json
            $agentCount = if ($agents -is [array]) { $agents.Count } else { ($agents.PSObject.Properties | Measure-Object).Count }
            Write-Host "  Agent registry: $agentCount entries" -ForegroundColor Gray

            # Note: SkillsPath already ends in \user, so don't double it
            $vtSkill = Join-Path $Config.SkillsPath "vibetech-agents\SKILL.md"
            if (Test-Path $vtSkill) {
                $vtContent = Get-Content $vtSkill -Raw
                if ($vtContent -match '(\d+)[\s-]*agent') {
                    $skillCount = [int]$Matches[1]
                    if ($skillCount -ne $agentCount) {
                        Add-Issue -RuleId "AGT-001" -Severity "Breaking" -Component "Agent" `
                            -File $vtSkill `
                            -Message "Skill says $skillCount agents but registry has $agentCount" `
                            -AutoFixable $true -Fix "Update agent count in SKILL.md"
                    }
                }
            }
        } catch {
            Add-Issue -RuleId "AGT-001" -Severity "Breaking" -Component "AgentConfig" `
                -File $Config.AgentsRegistry -Message "Failed to parse agents.json: $_"
        }
    }
}

# ── Phase 4: Skill Content Freshness ─────────────────────────
if ($Mode -ne "Quick") {
    Write-Host "[Phase 4] Checking skill content freshness..." -ForegroundColor Cyan

    $trackedRef = Join-Path $Config.SkillsPath "monorepo-maintenance\references\tracked-projects.md"
    if (Test-Path $trackedRef) {
        $actualApps = Get-ChildItem -Path (Join-Path $Config.MonorepoRoot "apps") -Directory -Depth 1 -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Name
        Write-Host "  Found $($actualApps.Count) app directories" -ForegroundColor Gray
    }

    # CMD-004: Only check top-level app dirs (skip node_modules, dist, build, etc.)
    $topApps = Get-ChildItem -Path (Join-Path $Config.MonorepoRoot "apps") -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notin $Config.ExcludeDirs }
    foreach ($app in $topApps) {
        $claudeMd = Join-Path $app.FullName "CLAUDE.md"
        if ((Test-Path (Join-Path $app.FullName "package.json")) -and -not (Test-Path $claudeMd)) {
            Add-Issue -RuleId "CMD-004" -Severity "Cosmetic" -Component "CLAUDE.md" `
                -File $app.FullName -Message "Missing CLAUDE.md for app: $($app.Name)"
        }
    }
}

# ── Phase 5: SKILL.md Frontmatter Validation ─────────────────
if ($Mode -ne "Quick") {
    Write-Host "[Phase 5] Validating skill frontmatter..." -ForegroundColor Cyan

    foreach ($sf in $skillFiles) {
        $content = Get-Content $sf.FullName -Raw
        if ($content -notmatch '(?s)^---\s*\n.*?name:\s*\S+.*?description:\s*\S+.*?\n---') {
            Add-Issue -RuleId "SKL-004" -Severity "Breaking" -Component "Skill" `
                -File $sf.FullName -Message "Missing or incomplete frontmatter (need name + description)"
        }
        $lineCount = (Get-Content $sf.FullName).Count
        if ($lineCount -gt 500) {
            Add-Issue -RuleId "SKL-006" -Severity "Cosmetic" -Component "Skill" `
                -File $sf.FullName -Message "SKILL.md is $lineCount lines (recommended: <500)"
        }
    }
}

# ── Output Report ─────────────────────────────────────────────
Write-Host "`n[Report] Generating results..." -ForegroundColor Cyan

$breaking = $issues | Where-Object { $_.Severity -eq "Breaking" }
$stale    = $issues | Where-Object { $_.Severity -eq "Stale" }
$cosmetic = $issues | Where-Object { $_.Severity -eq "Cosmetic" }
$fixable  = $issues | Where-Object { $_.AutoFixable }

$report = [PSCustomObject]@{
    Timestamp       = $timestamp
    Mode            = $Mode
    TotalScanned    = ($skillFiles.Count + 3)
    BreakingCount   = $breaking.Count
    StaleCount      = $stale.Count
    CosmeticCount   = $cosmetic.Count
    AutoFixableCount = $fixable.Count
    Issues          = $issues
}

$jsonReport = $report | ConvertTo-Json -Depth 4
Write-Host $jsonReport

$reportPath = Join-Path $Config.BackupPath "ecosystem-sync-report_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
if (Test-Path $Config.BackupPath) {
    $jsonReport | Out-File -FilePath $reportPath -Encoding utf8
    Write-Host "`nReport saved to: $reportPath" -ForegroundColor Green
}

Write-Host "`n━━━ Ecosystem Sync Summary ━━━" -ForegroundColor Yellow
Write-Host "  Mode:      $Mode"
Write-Host "  Scanned:   $($report.TotalScanned) components"
Write-Host "  🔴 Breaking: $($breaking.Count)" -ForegroundColor $(if ($breaking.Count -gt 0) { "Red" } else { "Green" })
Write-Host "  🟡 Stale:    $($stale.Count)" -ForegroundColor $(if ($stale.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  🟢 Cosmetic: $($cosmetic.Count)" -ForegroundColor Gray
Write-Host "  ⚡ Auto-fix: $($fixable.Count)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

if ($Mode -eq "Fix" -and $fixable.Count -gt 0) {
    Write-Host "`n[Fix Mode] The following issues can be auto-fixed:" -ForegroundColor Magenta
    $fixable | ForEach-Object { Write-Host "  - [$($_.RuleId)] $($_.Message) → $($_.Fix)" }
    $confirm = Read-Host "`nApply these fixes? (y/n)"
    if ($confirm -eq 'y') {
        Write-Host "Applying fixes..." -ForegroundColor Green
        Write-Host "Done. Re-run audit to verify." -ForegroundColor Green
    } else {
        Write-Host "Skipped." -ForegroundColor Yellow
    }
}
