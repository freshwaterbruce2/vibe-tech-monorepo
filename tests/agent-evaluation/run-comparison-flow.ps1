[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('auto', 'moonshot', 'scripted')]
    [string]$ProviderA = 'scripted',

    [Parameter()]
    [ValidateSet('auto', 'moonshot', 'scripted')]
    [string]$ProviderB = 'moonshot',

    [Parameter()]
    [string]$OutputName = 'comparator_vis',

    [Parameter()]
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Resolve root path
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$LogsDir = 'D:\logs\agent-evaluation'

# Ensure output directory exists (data/logs are strictly segregrated on D:\)
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

Write-Host "Responsible AI Toolkit - Automated LLM Comparator Workflow" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------" -ForegroundColor Gray
Write-Host "Comparing: $ProviderA vs $ProviderB" -ForegroundColor Yellow
Write-Host "Output: $LogsDir\$OutputName.json" -ForegroundColor Yellow
Write-Host ""

# Check environment for API keys if provider B/A requires it
if (($ProviderA -eq 'moonshot' -or $ProviderB -eq 'moonshot') -and -not $env:KIMI_API_KEY) {
    if (-not $Force) {
        Write-Error "Error: KIMI_API_KEY is not defined in your environment, which is required for moonshot provider execution. Use -Force to run anyway."
    } else {
        Write-Warning "KIMI_API_KEY is missing but -Force was passed. Execution may fail."
    }
}

# Preserve existing env variable
$OldProvider = $env:AGENT_ENGINE_BEHAVIORAL_PROVIDER

try {
    # 1. Run evaluation with Provider A
    Write-Host "[1/3] Running tests for $ProviderA..." -ForegroundColor Cyan
    $env:AGENT_ENGINE_BEHAVIORAL_PROVIDER = $ProviderA
    $RunAPath = Join-Path $LogsDir "run_a.json"
    
    # Execute the existing grounding test runner and redirect output to D:\
    & (Join-Path $PSScriptRoot "run-web-search-grounding-tests.ps1") -TestCategory "all" -OutputFormat "json" > $RunAPath
    Write-Host "  -> Finished Run A. Output saved to $RunAPath" -ForegroundColor Gray

    # 2. Run evaluation with Provider B
    Write-Host "[2/3] Running tests for $ProviderB..." -ForegroundColor Cyan
    $env:AGENT_ENGINE_BEHAVIORAL_PROVIDER = $ProviderB
    $RunBPath = Join-Path $LogsDir "run_b.json"
    
    # Execute the existing grounding test runner and redirect output to D:\
    & (Join-Path $PSScriptRoot "run-web-search-grounding-tests.ps1") -TestCategory "all" -OutputFormat "json" > $RunBPath
    Write-Host "  -> Finished Run B. Output saved to $RunBPath" -ForegroundColor Gray

    # 3. Convert traces using convert-eval-to-comparator
    Write-Host "[3/3] Generating LLM Comparator visualization file..." -ForegroundColor Cyan
    
    $ConvertScript = Join-Path $PSScriptRoot "convert-eval-to-comparator.ts"
    $OutputPath = Join-Path $LogsDir "$OutputName.json"
    
    $Command = @(
        'pnpm',
        '--dir',
        (Join-Path $RepoRoot 'apps\agent-engine'),
        'tsx',
        $ConvertScript,
        $RunAPath,
        $RunBPath,
        $OutputPath
    )
    
    & $Command[0] @($Command[1..($Command.Length - 1)])

    Write-Host "---------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Successfully generated LLM Comparator JSON file!" -ForegroundColor Green
    Write-Host "File Path: $OutputPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "To visualize the results:"
    Write-Host "1. Go to the LLM Comparator App (https://pair-code.github.io/llm-comparator/)"
    Write-Host "2. Drag and drop the generated JSON file ($OutputPath)"
    Write-Host "3. Analyze the side-by-side performance of $ProviderA vs $ProviderB."
    Write-Host ""
}
finally {
    # Restore environmental state
    if ($OldProvider) {
        $env:AGENT_ENGINE_BEHAVIORAL_PROVIDER = $OldProvider
    } else {
        Remove-Item Env:\AGENT_ENGINE_BEHAVIORAL_PROVIDER -ErrorAction SilentlyContinue
    }
}
