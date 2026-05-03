[CmdletBinding()]
param(
    [Parameter(Position = 0)] [string] $ProjectName,
    [switch] $Force
)

. "$PSScriptRoot\_lib.ps1"

if ([string]::IsNullOrWhiteSpace($ProjectName)) {
    Write-Host ''
    Write-Host 'Usage: pnpm project:start <project-name> [-Force]'
    Write-Host ''
    Write-Host 'Example: pnpm project:start invoice-automation-saas'
    exit 1
}

$projectDir = Join-Path $Script:RepoRoot "apps\$ProjectName"
if (-not (Test-Path $projectDir)) {
    Write-Host ''
    Write-Host "ERROR: apps\$ProjectName does not exist."
    Write-Host '       Active project lock requires a real app under apps/.'
    exit 1
}

$existing = Get-Lock
if (Test-LockActive $existing) {
    $counts = Get-CountSatisfied $existing
    if ($counts.Met -lt $counts.Total -and -not $Force) {
        Write-Host ''
        Write-Host "REFUSE: existing lock on '$($existing.activeProject)' has $($counts.Total - $counts.Met) unmet criteria."
        Write-Host ''
        Write-Host '  Either finish it:'
        Write-Host '    pnpm project:status     # see what is left'
        Write-Host '    pnpm project:check      # update auto criteria'
        Write-Host '    pnpm project:complete   # archive and clear lock'
        Write-Host ''
        Write-Host '  Or force-replace the lock:'
        Write-Host "    pnpm project:start $ProjectName -- -Force"
        Write-Host ''
        exit 1
    }
    if ($Force) {
        Write-Host "WARNING: replacing incomplete lock on '$($existing.activeProject)'."
    }
}

$user = $env:USERNAME
if (-not $user) { $user = 'unknown' }

$lock = [pscustomobject]@{
    activeProject = $ProjectName
    lockedAt      = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    lockedBy      = $user
    criteria      = New-DefaultCriteria -ProjectName $ProjectName
    allowedPaths  = New-DefaultAllowedPaths -ProjectName $ProjectName
}

Save-Lock -Lock $lock

Write-Host ''
Write-Host "Active project lock: $ProjectName"
Write-Host "  state:    $Script:LockPath"
Write-Host "  criteria: $($lock.criteria.Count) (6 auto + 0 manual — add manual ones by editing $Script:LockPath)"
Write-Host ''
Write-Host '  Next:'
Write-Host '    pnpm project:status   # show checklist'
Write-Host '    pnpm project:check    # run auto criteria'
Write-Host ''
