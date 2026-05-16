[CmdletBinding()] param([switch] $SkipAutoCheck)

. "$PSScriptRoot\_lib.ps1"

$lock = Get-Lock
if (-not (Test-LockActive $lock)) {
    Write-Host 'No active project lock to complete.'
    exit 0
}

if (-not $SkipAutoCheck) {
    Write-Host 'Running auto criteria first via check.ps1...'
    & "$PSScriptRoot\check.ps1"
    $lock = Get-Lock  # re-read after check writes back
}

$unmet = @($lock.criteria | Where-Object { -not $_.satisfied })

if ($unmet.Count -gt 0) {
    Write-Host ''
    Write-Host "REFUSE: cannot complete '$($lock.activeProject)' — $($unmet.Count) criteria still unmet:"
    foreach ($c in $unmet) {
        Write-Host ("    [ ] ($($c.type)) {0} - {1}" -f $c.id, $c.description)
    }
    Write-Host ''
    Write-Host 'Manual criteria flip only when YOU confirm them — edit the JSON or have me mark them done after testing.'
    Write-Host "  $Script:LockPath"
    Write-Host ''
    exit 1
}

# All met — archive and clear
if (-not (Test-Path $Script:HistoryDir)) {
    New-Item -ItemType Directory -Path $Script:HistoryDir -Force | Out-Null
}
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$archivePath = Join-Path $Script:HistoryDir ("{0}-{1}.json" -f $lock.activeProject, $timestamp)

# Add completion timestamp before archiving
$archive = $lock | ConvertTo-Json -Depth 10 | ConvertFrom-Json
$archive | Add-Member -NotePropertyName 'completedAt' -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))
$archive | ConvertTo-Json -Depth 10 | Set-Content -Path $archivePath -Encoding UTF8

Remove-Item -Path $Script:LockPath -Force

Write-Host ''
Write-Host "DONE: '$($lock.activeProject)' completed."
Write-Host "  archived to: $archivePath"
Write-Host '  active-project.json cleared.'
Write-Host ''
Write-Host '  Start the next project: pnpm project:start <name>'
Write-Host ''
