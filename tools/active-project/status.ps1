[CmdletBinding()] param()

. "$PSScriptRoot\_lib.ps1"

$lock = Get-Lock

if (-not (Test-LockActive $lock)) {
    Write-Host ''
    Write-Host 'No active project lock.'
    Write-Host '  Start one with: pnpm project:start <project-name>'
    Write-Host ''
    exit 0
}

$counts = Get-CountSatisfied $lock

Write-Host ''
Write-Host "Active project: $($lock.activeProject)"
Write-Host "  locked at:  $($lock.lockedAt)"
Write-Host "  locked by:  $($lock.lockedBy)"
Write-Host "  progress:   $($counts.Met)/$($counts.Total) criteria satisfied"
Write-Host ''
Write-Host '  Criteria:'

foreach ($c in $lock.criteria) {
    $mark = if ($c.satisfied) { '[x]' } else { '[ ]' }
    $tag  = "($($c.type))"
    Write-Host ("    {0} {1,-8} {2} - {3}" -f $mark, $tag, $c.id, $c.description)
}

Write-Host ''
Write-Host '  Allowed paths:'
foreach ($p in $lock.allowedPaths) {
    Write-Host "    $p"
}
Write-Host ''

if ($counts.Met -lt $counts.Total) {
    Write-Host '  Next: pnpm project:check (refresh auto criteria)'
} else {
    Write-Host '  All criteria met — run: pnpm project:complete'
}
Write-Host ''
