# Self-contained test runner for tools/active-project/.
# No external deps (no Pester required).
# Usage: pwsh -File C:\dev\tools\active-project\tests\run-tests.ps1
# Exit 0 = all pass, 1 = any failed.

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\_lib.ps1"

$Script:Failures = 0
$Script:Passed   = 0

function Assert-Equal {
    param($Expected, $Actual, [string]$Message)
    if ($Expected -eq $Actual) {
        $Script:Passed++
        Write-Host "  PASS  $Message"
    } else {
        $Script:Failures++
        Write-Host "  FAIL  $Message"
        Write-Host "          expected: $Expected"
        Write-Host "          actual:   $Actual"
    }
}

function Assert-True  { param($Cond, [string]$Msg) Assert-Equal -Expected $true  -Actual ([bool]$Cond) -Message $Msg }
function Assert-False { param($Cond, [string]$Msg) Assert-Equal -Expected $false -Actual ([bool]$Cond) -Message $Msg }

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Test-GlobMatch'
Write-Host '─────────────────────────────────────────────────────────────────────'

Assert-True  (Test-GlobMatch -Path 'apps/foo/src/index.ts'   -Glob 'apps/foo/**')         'apps/foo/** matches apps/foo/src/index.ts'
Assert-True  (Test-GlobMatch -Path 'apps/foo/index.ts'        -Glob 'apps/foo/**')         'apps/foo/** matches apps/foo/index.ts'
Assert-False (Test-GlobMatch -Path 'apps/bar/src/index.ts'   -Glob 'apps/foo/**')         'apps/foo/** does NOT match apps/bar/src/index.ts'
Assert-True  (Test-GlobMatch -Path 'packages/shared/x.ts'    -Glob 'packages/**')         'packages/** matches packages/shared/x.ts'
Assert-True  (Test-GlobMatch -Path 'packages/a/b/c/d.ts'     -Glob 'packages/**')         'packages/** matches deeply nested files'
Assert-False (Test-GlobMatch -Path 'apps/foo/index.ts'       -Glob 'packages/**')         'packages/** does NOT match apps/foo/index.ts'

Assert-True  (Test-GlobMatch -Path 'package.json'             -Glob 'package.json')        'literal package.json'
Assert-False (Test-GlobMatch -Path 'apps/foo/package.json'   -Glob 'package.json')        'literal package.json does NOT match nested package.json'

Assert-True  (Test-GlobMatch -Path 'README.md'                -Glob '*.md')                '*.md matches root README.md'
Assert-False (Test-GlobMatch -Path 'docs/guide.md'           -Glob '*.md')                '*.md does NOT match nested file (no ** segment)'
Assert-True  (Test-GlobMatch -Path 'docs/guide.md'           -Glob '**/*.md')             '**/*.md matches nested .md'

# Backslash normalization
Assert-True  (Test-GlobMatch -Path 'apps\foo\src\x.ts'       -Glob 'apps/foo/**')         'backslash path normalized'
Assert-True  (Test-GlobMatch -Path 'apps/foo/src/x.ts'       -Glob 'apps\foo\**')         'backslash glob normalized'

# Edge cases — ensure regex special chars in glob are treated literally
Assert-True  (Test-GlobMatch -Path 'tools/active-project/start.ps1' -Glob 'tools/active-project/**') 'hyphenated dir'
Assert-False (Test-GlobMatch -Path 'tools/active+project/start.ps1' -Glob 'tools/active-project/**') 'literal hyphen — does NOT match plus'

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Test-PathAllowed (composes globs)'
Write-Host '─────────────────────────────────────────────────────────────────────'

$allow = @('apps/invoice-automation-saas/**', 'packages/**', '*.md', 'package.json')

Assert-True  (Test-PathAllowed -Path 'apps/invoice-automation-saas/src/main.ts' -AllowedPaths $allow) 'active project src allowed'
Assert-True  (Test-PathAllowed -Path 'packages/memory/src/x.ts'                  -AllowedPaths $allow) 'shared package allowed'
Assert-True  (Test-PathAllowed -Path 'README.md'                                  -AllowedPaths $allow) 'root README.md allowed'
Assert-True  (Test-PathAllowed -Path 'package.json'                                -AllowedPaths $allow) 'root package.json allowed'

Assert-False (Test-PathAllowed -Path 'apps/vibe-shop/src/main.ts'                -AllowedPaths $allow) 'OTHER app blocked'
Assert-False (Test-PathAllowed -Path 'apps/vibe-shop/package.json'               -AllowedPaths $allow) 'OTHER app package.json blocked (literal package.json glob is root only)'
Assert-False (Test-PathAllowed -Path 'docs/architecture.md'                      -AllowedPaths $allow) 'nested .md NOT allowed by *.md'

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Lock helpers'
Write-Host '─────────────────────────────────────────────────────────────────────'

# Test New-DefaultCriteria shape
$crit = New-DefaultCriteria -ProjectName 'foo'
Assert-Equal 6 $crit.Count                                   'six default criteria'
Assert-Equal 'auto' $crit[0].type                             'first criterion is auto type'
Assert-False ([bool]$crit[0].satisfied)                       'criteria start unsatisfied'

# Test New-DefaultAllowedPaths shape
$paths = New-DefaultAllowedPaths -ProjectName 'foo'
Assert-True  ($paths -contains 'apps/foo/**')                 'allowed paths includes active project glob'
Assert-True  ($paths -contains 'packages/**')                 'allowed paths includes packages'
Assert-True  ($paths -contains 'package.json')                'allowed paths includes root package.json'

# Test-LockActive
Assert-False (Test-LockActive $null)                          'null lock = inactive'
Assert-False (Test-LockActive @{ activeProject = $null })     'null activeProject = inactive'
Assert-False (Test-LockActive @{ activeProject = '' })        'empty activeProject = inactive'
Assert-True  (Test-LockActive @{ activeProject = 'foo' })     'non-empty activeProject = active'

# ─────────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host "Summary"
Write-Host "─────────────────────────────────────────────────────────────────────"
Write-Host "  Passed: $Script:Passed"
Write-Host "  Failed: $Script:Failures"
Write-Host ''

if ($Script:Failures -gt 0) { exit 1 } else { exit 0 }
