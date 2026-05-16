# Integration tests for cross-project gating.
# Calls Test-StagedFiles directly (in-process) to avoid subprocess arg-passing issues.

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\_lib.ps1"

$Script:Failures = 0
$Script:Passed   = 0

function New-TestLock {
    param([string]$ProjectName, [string[]]$AllowedPaths, [bool[]]$Satisfied = @($false))
    $criteria = @()
    for ($i = 0; $i -lt $Satisfied.Count; $i++) {
        $criteria += [pscustomobject]@{ id = "auto-$i"; type = 'auto'; description = "auto $i"; satisfied = $Satisfied[$i] }
    }
    return [pscustomobject]@{
        activeProject = $ProjectName
        lockedAt      = '2026-05-03T00:00:00Z'
        lockedBy      = 'test'
        criteria      = $criteria
        allowedPaths  = $AllowedPaths
    }
}

function Assert-Result {
    param([int]$ExpectedExit, $Result, [string]$Message, [string]$ExpectedReason = $null)
    $ok = ($ExpectedExit -eq $Result.ExitCode)
    if ($ExpectedReason -and $Result.Reason -ne $ExpectedReason) { $ok = $false }
    if ($ok) {
        $Script:Passed++
        Write-Host "  PASS  $Message (exit=$($Result.ExitCode), reason=$($Result.Reason))"
    } else {
        $Script:Failures++
        Write-Host "  FAIL  $Message"
        Write-Host "          expected exit=$ExpectedExit reason=$ExpectedReason"
        Write-Host "          actual   exit=$($Result.ExitCode) reason=$($Result.Reason) violations=$($Result.Violations -join ',')"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Test-StagedFiles integration'
Write-Host '─────────────────────────────────────────────────────────────────────'

$lock = New-TestLock -ProjectName 'foo' -AllowedPaths @('apps/foo/**', 'packages/**', 'package.json', '*.md')

# Scenario 1: no lock at all → exit 0
$r = Test-StagedFiles -Lock $null -StagedFiles @('apps/anything/x.ts')
Assert-Result -ExpectedExit 0 -Result $r -Message 'no lock → allow' -ExpectedReason 'no-active-lock'

# Scenario 2: lock with null activeProject → exit 0
$r = Test-StagedFiles -Lock ([pscustomobject]@{ activeProject = $null; allowedPaths = @() }) -StagedFiles @('apps/anything/x.ts')
Assert-Result -ExpectedExit 0 -Result $r -Message 'lock with null activeProject → allow' -ExpectedReason 'no-active-lock'

# Scenario 3: lock with empty activeProject → exit 0
$r = Test-StagedFiles -Lock ([pscustomobject]@{ activeProject = ''; allowedPaths = @() }) -StagedFiles @('apps/anything/x.ts')
Assert-Result -ExpectedExit 0 -Result $r -Message 'lock with empty activeProject → allow' -ExpectedReason 'no-active-lock'

# Scenario 4: active lock, all staged files in active project → exit 0
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps/foo/src/x.ts', 'apps/foo/README.md')
Assert-Result -ExpectedExit 0 -Result $r -Message 'all staged files in active project' -ExpectedReason 'all-allowed'

# Scenario 5: active lock, staged files include packages/ → exit 0
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps/foo/src/x.ts', 'packages/shared/y.ts')
Assert-Result -ExpectedExit 0 -Result $r -Message 'shared packages allowed alongside active project' -ExpectedReason 'all-allowed'

# Scenario 6: active lock, cross-project file staged → exit 1
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps/bar/src/x.ts')
Assert-Result -ExpectedExit 1 -Result $r -Message 'cross-project file → block' -ExpectedReason 'violations'
if ($r.Violations -notcontains 'apps/bar/src/x.ts') { $Script:Failures++; Write-Host '  FAIL  expected violation list to contain apps/bar/src/x.ts' }

# Scenario 7: mix of allowed + blocked → exit 1, violations list ONLY has blocked one
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps/foo/src/x.ts', 'apps/bar/src/y.ts')
Assert-Result -ExpectedExit 1 -Result $r -Message 'mixed allowed+blocked → block' -ExpectedReason 'violations'
if ($r.Violations.Count -ne 1 -or $r.Violations[0] -ne 'apps/bar/src/y.ts') {
    $Script:Failures++
    Write-Host "  FAIL  expected violations=[apps/bar/src/y.ts], got $($r.Violations -join ',')"
}

# Scenario 8: -Bypass switch → exit 0 even with violations
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps/bar/src/x.ts') -Bypass
Assert-Result -ExpectedExit 0 -Result $r -Message 'bypass overrides everything' -ExpectedReason 'bypass'

# Scenario 9: no staged files → exit 0
$r = Test-StagedFiles -Lock $lock -StagedFiles @()
Assert-Result -ExpectedExit 0 -Result $r -Message 'empty staged list → allow' -ExpectedReason 'no-staged-files'

# Scenario 10: backslash paths (defensive normalization)
$r = Test-StagedFiles -Lock $lock -StagedFiles @('apps\foo\src\x.ts')
Assert-Result -ExpectedExit 0 -Result $r -Message 'backslash paths normalized' -ExpectedReason 'all-allowed'

# Scenario 11: staged file is root-level *.md → allowed by *.md glob
$r = Test-StagedFiles -Lock $lock -StagedFiles @('CHANGELOG.md')
Assert-Result -ExpectedExit 0 -Result $r -Message 'root *.md allowed' -ExpectedReason 'all-allowed'

# Scenario 12: staged file is nested .md not in active project → blocked
$r = Test-StagedFiles -Lock $lock -StagedFiles @('docs/random.md')
Assert-Result -ExpectedExit 1 -Result $r -Message 'nested .md outside active project → block' -ExpectedReason 'violations'

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Get-Lock with env override'
Write-Host '─────────────────────────────────────────────────────────────────────'

$tempLock = Join-Path $env:TEMP "active-project-test-$([guid]::NewGuid().ToString('N')).json"
try {
    @{ activeProject = 'baz'; criteria = @(); allowedPaths = @('apps/baz/**') } |
        ConvertTo-Json | Set-Content -Path $tempLock -Encoding UTF8

    # Re-source _lib in a sub-scope so it picks up the env var
    $env:ACTIVE_PROJECT_LOCK_PATH = $tempLock
    $loaded = & {
        . "$PSScriptRoot\..\_lib.ps1"
        Get-Lock
    }
    if ($loaded.activeProject -eq 'baz') {
        $Script:Passed++; Write-Host '  PASS  ACTIVE_PROJECT_LOCK_PATH override loads custom lock'
    } else {
        $Script:Failures++; Write-Host "  FAIL  expected activeProject=baz, got $($loaded.activeProject)"
    }
} finally {
    Remove-Item $tempLock -ErrorAction SilentlyContinue
    Remove-Item env:ACTIVE_PROJECT_LOCK_PATH -ErrorAction SilentlyContinue
}

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Summary'
Write-Host '─────────────────────────────────────────────────────────────────────'
Write-Host "  Passed: $Script:Passed"
Write-Host "  Failed: $Script:Failures"
Write-Host ''

if ($Script:Failures -gt 0) { exit 1 } else { exit 0 }
