# Shared helpers for active-project tooling.
# Dot-source from other scripts: . "$PSScriptRoot\_lib.ps1"

$Script:LockPath    = if ($env:ACTIVE_PROJECT_LOCK_PATH) { $env:ACTIVE_PROJECT_LOCK_PATH } else { 'D:\active-project\active-project.json' }
$Script:HistoryDir  = if ($env:ACTIVE_PROJECT_HISTORY_DIR) { $env:ACTIVE_PROJECT_HISTORY_DIR } else { 'D:\active-project\history' }
$Script:RepoRoot    = if ($env:ACTIVE_PROJECT_REPO_ROOT) { $env:ACTIVE_PROJECT_REPO_ROOT } else { 'C:\dev' }

function Get-Lock {
    if (-not (Test-Path $Script:LockPath)) { return $null }
    try {
        return Get-Content $Script:LockPath -Raw | ConvertFrom-Json
    } catch {
        Write-Error "Failed to parse $Script:LockPath: $_"
        exit 2
    }
}

function Save-Lock {
    param([Parameter(Mandatory)] $Lock)
    $dir = Split-Path -Parent $Script:LockPath
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $json = $Lock | ConvertTo-Json -Depth 10
    Set-Content -Path $Script:LockPath -Value $json -Encoding UTF8
}

function Test-LockActive {
    param($Lock)
    return ($null -ne $Lock) -and (-not [string]::IsNullOrWhiteSpace($Lock.activeProject))
}

# Glob matcher: converts a glob (with **, *) to a regex and tests against a path.
# Both inputs are normalized to forward slashes first.
function Test-GlobMatch {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $Glob
    )
    $p = $Path -replace '\\', '/'
    $g = $Glob -replace '\\', '/'

    # Escape regex special chars except * and /
    $rx = [regex]::Escape($g)
    # Un-escape the * we want to keep meaningful (Escape turns * into \*)
    $rx = $rx -replace '\\\*\\\*', '__GLOBSTAR__'
    $rx = $rx -replace '\\\*', '[^/]*'
    $rx = $rx -replace '__GLOBSTAR__', '.*'
    $rx = '^' + $rx + '$'

    return $p -match $rx
}

function Test-PathAllowed {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string[]] $AllowedPaths
    )
    foreach ($glob in $AllowedPaths) {
        if (Test-GlobMatch -Path $Path -Glob $glob) { return $true }
    }
    return $false
}

function Get-CountSatisfied {
    param($Lock)
    if (-not $Lock -or -not $Lock.criteria) { return @{ Met = 0; Total = 0 } }
    $met = ($Lock.criteria | Where-Object { $_.satisfied }).Count
    return @{ Met = $met; Total = $Lock.criteria.Count }
}

function New-DefaultCriteria {
    param([Parameter(Mandatory)][string] $ProjectName)
    return @(
        [pscustomobject]@{ id = 'build';     type = 'auto';   description = "pnpm nx build $ProjectName passes";              satisfied = $false }
        [pscustomobject]@{ id = 'typecheck'; type = 'auto';   description = "pnpm nx typecheck $ProjectName passes";          satisfied = $false }
        [pscustomobject]@{ id = 'lint';      type = 'auto';   description = "pnpm nx lint $ProjectName passes (0 warnings)";  satisfied = $false }
        [pscustomobject]@{ id = 'test';      type = 'auto';   description = "pnpm nx test $ProjectName passes";               satisfied = $false }
        [pscustomobject]@{ id = 'no-todos';  type = 'auto';   description = 'no TODO/FIXME in apps/<project>/src';            satisfied = $false }
        [pscustomobject]@{ id = 'no-mocks';  type = 'auto';   description = 'no Not-Implemented / placeholder markers in src';satisfied = $false }
    )
}

function Test-StagedFiles {
    # Pure logic: given a lock and a list of staged files, returns
    # @{ ExitCode = 0|1; Violations = @(...); Lock = $lock }
    # Caller decides what to print and how to exit.
    param(
        $Lock,
        [string[]] $StagedFiles,
        [switch] $Bypass
    )
    if ($Bypass) {
        return @{ ExitCode = 0; Violations = @(); Lock = $Lock; Reason = 'bypass' }
    }
    if (-not (Test-LockActive $Lock)) {
        return @{ ExitCode = 0; Violations = @(); Lock = $Lock; Reason = 'no-active-lock' }
    }
    if (-not $StagedFiles -or $StagedFiles.Count -eq 0) {
        return @{ ExitCode = 0; Violations = @(); Lock = $Lock; Reason = 'no-staged-files' }
    }
    $violations = @()
    foreach ($file in $StagedFiles) {
        if ([string]::IsNullOrWhiteSpace($file)) { continue }
        if (-not (Test-PathAllowed -Path $file -AllowedPaths $Lock.allowedPaths)) {
            $violations += $file
        }
    }
    if ($violations.Count -eq 0) {
        return @{ ExitCode = 0; Violations = @(); Lock = $Lock; Reason = 'all-allowed' }
    }
    return @{ ExitCode = 1; Violations = $violations; Lock = $Lock; Reason = 'violations' }
}

function New-DefaultAllowedPaths {
    param([Parameter(Mandatory)][string] $ProjectName)
    return @(
        "apps/$ProjectName/**",
        'packages/**',
        'tools/active-project/**',
        '.claude/**',
        '*.md',
        'package.json',
        'pnpm-lock.yaml',
        'nx.json',
        'tsconfig.base.json'
    )
}
