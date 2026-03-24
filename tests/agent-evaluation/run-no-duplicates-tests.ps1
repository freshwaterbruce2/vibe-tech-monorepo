[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('all', 'file-creation', 'features', 'components', 'services', 'communication', 'adversarial')]
    [string]$TestCategory = 'all',

    [Parameter()]
    [string]$TestId = '',

    [Parameter()]
    [ValidateSet('console', 'json', 'markdown')]
    [string]$OutputFormat = 'console',

    [Parameter()]
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$FixturePath = Join-Path $PSScriptRoot 'behavioral-suites.json'
$Fixture = Get-Content -Raw $FixturePath | ConvertFrom-Json
$Suite = $Fixture.suites | Where-Object { $_.id -eq 'behavioral-no-duplicates' }

if (-not $Suite) {
    throw 'behavioral-no-duplicates suite not found in behavioral-suites.json'
}

$Filter = if ($TestId) { $TestId } elseif ($TestCategory -ne 'all') { $TestCategory } else { '' }
$Command = @(
    'pnpm',
    '--dir',
    (Join-Path $RepoRoot 'apps\agent-engine'),
    'tsx',
    'src/index.ts',
    'behavioral-eval',
    'behavioral-no-duplicates'
)

if ($Filter) {
    $Command += $Filter
}

if ($Verbose) {
    Write-Host "Running live behavioral suite through agent-engine:" -ForegroundColor Cyan
    Write-Host ($Command -join ' ') -ForegroundColor DarkGray
}

$Output = & $Command[0] @($Command[1..($Command.Length - 1)]) 2>&1
$ExitCode = $LASTEXITCODE
$Joined = ($Output | Out-String).Trim()

if ($OutputFormat -eq 'json') {
    Write-Output $Joined
    exit $ExitCode
}

$Parsed = $null
if ($Joined) {
    try {
        $Parsed = $Joined | ConvertFrom-Json -Depth 100
    } catch {
        $Parsed = $null
    }
}

if ($OutputFormat -eq 'markdown' -and $Parsed) {
    Write-Output "# No Duplicates Rule"
    Write-Output ""
    Write-Output "- Suite: $($Parsed.suite)"
    if ($Parsed.provider) {
        Write-Output "- Provider: $($Parsed.provider)"
    }
    if ($Parsed.cases) {
        foreach ($Case in $Parsed.cases) {
            $Status = if ($Case.passed) { 'PASS' } else { 'FAIL' }
            Write-Output "- $($Case.id): $Status ($([math]::Round($Case.score, 2)))"
        }
    }
    exit $ExitCode
}

Write-Host 'No Duplicates Rule - Live Behavioral Runner' -ForegroundColor Cyan
Write-Host "Suite: $($Suite.name)" -ForegroundColor Gray
if ($Parsed -and $Parsed.provider) {
    Write-Host "Provider: $($Parsed.provider)" -ForegroundColor Gray
}
Write-Host ''

if ($Parsed -and $Parsed.cases) {
    foreach ($Case in $Parsed.cases) {
        $Color = if ($Case.passed) { 'Green' } else { 'Red' }
        $Status = if ($Case.passed) { 'PASS' } else { 'FAIL' }
        Write-Host "[$($Case.id)] $Status $($Case.name)" -ForegroundColor $Color
    }
} elseif ($Joined) {
    Write-Output $Joined
}

exit $ExitCode
