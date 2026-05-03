[CmdletBinding()]
param(
    # Optional: pre-supplied staged files (used by tests). Defaults to `git diff --cached`.
    [string[]] $StagedFiles
)

. "$PSScriptRoot\_lib.ps1"

$bypass = ($env:ALLOW_CROSS_PROJECT -eq '1')

$lock = Get-Lock

if ($null -eq $StagedFiles -or $StagedFiles.Count -eq 0) {
    if (-not $PSBoundParameters.ContainsKey('StagedFiles')) {
        $StagedFiles = @(& git diff --cached --name-only --diff-filter=ACMR 2>$null)
    }
}

$result = Test-StagedFiles -Lock $lock -StagedFiles $StagedFiles -Bypass:$bypass

if ($result.ExitCode -eq 0) { exit 0 }

# Render violation report
$counts = Get-CountSatisfied $lock
$unmet  = @($lock.criteria | Where-Object { -not $_.satisfied })

Write-Host ''
Write-Host 'REFUSE: cross-project commit blocked.'
Write-Host "  Active project: $($lock.activeProject) ($($counts.Met)/$($counts.Total) criteria met)"
Write-Host ''
Write-Host '  Files outside allowed paths:'
foreach ($v in $result.Violations) { Write-Host "    $v" }
Write-Host ''
Write-Host '  Allowed paths for this lock:'
foreach ($p in $lock.allowedPaths) { Write-Host "    $p" }
Write-Host ''
if ($unmet.Count -gt 0) {
    Write-Host '  Unmet criteria:'
    foreach ($c in $unmet) {
        Write-Host ("    [ ] ($($c.type)) {0} - {1}" -f $c.id, $c.description)
    }
    Write-Host ''
}
Write-Host '  Options:'
Write-Host "    1) Move the changes to apps/$($lock.activeProject)/ or another allowed path"
Write-Host '    2) Run: pnpm project:status      # review the lock'
Write-Host '    3) Run: pnpm project:complete    # if you have actually finished it'
Write-Host '    4) Bypass intentionally:  ALLOW_CROSS_PROJECT=1 git commit ...'
Write-Host ''

exit 1
