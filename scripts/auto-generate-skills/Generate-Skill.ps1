# Generate-Skill.ps1
# AI-powered skill generation using Gemini 3 Pro based on learning patterns

param(
    [Parameter(Mandatory=$true)]
    [string]$PatternName,

    [Parameter(Mandatory=$false)]
    [ValidateSet("Skill", "Agent")]
    [string]$Type = "Skill",

    [Parameter(Mandatory=$false)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

# Paths
$AnalysisDir = "C:\dev\.agent\skills\auto-skill-creator\analysis"
$MonorepoRoot = "C:\dev"
$ExistingSkillsDir = "C:\dev\.agent\skills"
$ExistingAgentsDir = "C:\dev\.antigravity\agents"

# Load pattern data
Write-Host "Loading Pattern Data..." -ForegroundColor Cyan

$workflowPatterns = Import-Csv "$AnalysisDir\workflow-patterns.csv"
$toolPatterns = Import-Csv "$AnalysisDir\tool-usage-patterns.csv"
$codePatterns = Import-Csv "$AnalysisDir\code-patterns.csv"

# Find the specific pattern
$pattern = $workflowPatterns | Where-Object { $_.task_type -like "*$PatternName*" }

if (-not $pattern) {
    Write-Host "ERROR: Pattern '$PatternName' not found in analysis data" -ForegroundColor Red
    Write-Host "Available patterns:" -ForegroundColor Yellow
    $workflowPatterns | Select-Object task_type, frequency, avg_success_rate | Format-Table
    exit 1
}

Write-Host "Pattern Found:" -ForegroundColor Green
Write-Host "  Name: $($pattern.task_type)" -ForegroundColor White
Write-Host "  Frequency: $($pattern.frequency) occurrences" -ForegroundColor White
Write-Host "  Success Rate: $($pattern.avg_success_rate)%" -ForegroundColor White
Write-Host "  Average Steps: $($pattern.avg_steps)" -ForegroundColor White
Write-Host ""

# Get existing skills/agents for context
$existingSkills = Get-ChildItem -Path $ExistingSkillsDir -Directory | Select-Object -ExpandProperty Name
$existingAgents = Get-ChildItem -Path $ExistingAgentsDir -Filter "*.md" | ForEach-Object { $_.BaseName }

Write-Host "Existing Skills: $($existingSkills -join ', ')" -ForegroundColor Gray
Write-Host "Existing Agents: $($existingAgents -join ', ')" -ForegroundColor Gray
Write-Host ""

# Check for API key
$apiKey = $env:GEMINI_API_KEY
if (-not $apiKey) {
    Write-Host "ERROR: GEMINI_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:GEMINI_API_KEY = 'your-key'" -ForegroundColor Yellow
    exit 1
}

# Build context for AI prompt
$monorepoStructure = @"
VibeTech Nx Monorepo Structure:
- 52+ projects across 5 categories
- Apps: Web (React 19 + Vite 7), Desktop (Electron/Tauri), Mobile (Capacitor 7), PWAs
- Packages: Shared libraries (@nova/*, @vibetech/ui)
- Backend: Node.js/Python services
- Tech Stack: TypeScript 5.9, pnpm 9.15.0, Nx 21.6+, Tailwind 3.4.18
- Storage: C:\dev (code), D:\ (data/logs/databases)
- Package Manager: ALWAYS pnpm (never npm/yarn)
"@

$patternDetails = @"
Pattern Analysis:
- Pattern Name: $($pattern.task_type)
- Observed Occurrences: $($pattern.frequency)
- Success Rate: $($pattern.avg_success_rate)%
- Average Complexity: $($pattern.avg_steps) steps
- Related Tools: (from tool-usage-patterns.csv)
- Related Code Patterns: (from code-patterns.csv)
"@

# Construct Gemini API prompt
$promptContent = @"
You are a skill/agent generator for Google Antigravity IDE.

CONTEXT:
$monorepoStructure

LEARNING SYSTEM DATA:
$patternDetails

EXISTING SKILLS: $($existingSkills -join ', ')
EXISTING AGENTS: $($existingAgents -join ', ')

TASK:
Generate a new SKILL.md file for the pattern: "$($pattern.task_type)"

REQUIREMENTS:
1. Follow 2026 Antigravity best practices
2. Use YAML frontmatter + Markdown content
3. Include examples from learning system data
4. Document success rate and generation source
5. Follow one of these patterns: Basic Router, Reference, Few-shot, Tool Use, or All in One
6. Make it specific to VibeTech monorepo structure
7. Include safety measures (D:\ snapshots, validation)
8. Reference existing skills where appropriate
9. CRITICAL: Enforce monorepo rules (no duplicates, pnpm only, paths policy)

SKILL PATTERN EXAMPLES:

**All in One Pattern** (recommended for complex workflows):
---
name: skill-name
description: Brief description
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_pattern_${($pattern.frequency)}_occurrences
  success_rate: ${($pattern.avg_success_rate / 100)}
  category: development
---

# Skill Name

**Auto-generated from $($pattern.frequency) successful patterns**

## Overview
[What this skill does]

## Core Capabilities
[Main features]

## Usage Examples
[Step-by-step examples with actual commands]

## Integration with Monorepo
[How it fits into VibeTech workspace]

## Safety Measures
[Validation, snapshots, rollback]

## Related Skills
[Links to other skills]

OUTPUT FORMAT:
Return ONLY the complete SKILL.md content, starting with the YAML frontmatter (---).
Do NOT include any explanations before or after the markdown.
"@

Write-Host "Generating $Type with Gemini 3 Pro..." -ForegroundColor Cyan
Write-Host "This may take 10-30 seconds..." -ForegroundColor Gray
Write-Host ""

# Call Gemini API
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$apiKey"

$requestBody = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = $promptContent
                }
            )
        }
    )
    generationConfig = @{
        temperature = 0.7
        maxOutputTokens = 8192
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $requestBody -ContentType "application/json"
    $generatedContent = $response.candidates[0].content.parts[0].text

    # Clean up response (remove any markdown code fences if present)
    $generatedContent = $generatedContent -replace '^```markdown\s*', '' -replace '\s*```$', ''

    # Save to file
    if (-not $OutputPath) {
        $skillSlug = $PatternName -replace '\s+', '-' -replace '[^a-zA-Z0-9-]', ''
        $OutputPath = "$ExistingSkillsDir\$skillSlug\SKILL.md"
    }

    $outputDir = Split-Path -Parent $OutputPath
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

    $generatedContent | Out-File -FilePath $OutputPath -Encoding UTF8

    Write-Host "SUCCESS! Skill generated:" -ForegroundColor Green
    Write-Host "  File: $OutputPath" -ForegroundColor White
    Write-Host "  Size: $((Get-Item $OutputPath).Length) bytes" -ForegroundColor White
    Write-Host ""

    Write-Host "Generated Content Preview:" -ForegroundColor Cyan
    Write-Host "===========================" -ForegroundColor Gray
    Get-Content $OutputPath -Head 30
    Write-Host "..." -ForegroundColor Gray
    Write-Host ""

    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Review the generated skill: code $OutputPath" -ForegroundColor White
    Write-Host "2. Make any necessary edits" -ForegroundColor White
    Write-Host "3. Test the skill in Antigravity IDE" -ForegroundColor White
    Write-Host "4. If approved, it's ready to use!" -ForegroundColor White

} catch {
    Write-Host "ERROR: Failed to generate skill" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Verify GEMINI_API_KEY is valid" -ForegroundColor White
    Write-Host "- Check internet connection" -ForegroundColor White
    Write-Host "- Review API quotas at https://aistudio.google.com/" -ForegroundColor White
    exit 1
}
