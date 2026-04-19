# Get-DailyContext.ps1
# Emits structured JSON context for the /craft:daily-log slash command.
# Read-only: WORKSPACE.json, git state, listening ports.
# Usage: pwsh C:\dev\tools\scripts\Get-DailyContext.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = 'SilentlyContinue'

# --- WORKSPACE.json ----------------------------------------------------------
$workspacePath = 'C:\dev\WORKSPACE.json'
if (-not (Test-Path $workspacePath)) {
    Write-Error "WORKSPACE.json not found at $workspacePath"
    exit 1
}
$workspace = Get-Content $workspacePath -Raw | ConvertFrom-Json
$focus  = @($workspace.currentFocus)
$recent = @($workspace.recentActivity | Select-Object -First 5 | ForEach-Object {
    [pscustomobject]@{ date = $_.date; project = $_.project; action = $_.action }
})

# --- Git state ---------------------------------------------------------------
Push-Location 'C:\dev'
try {
    $branch = (& git rev-parse --abbrev-ref HEAD) 2>$null
    $commitsAhead = @()
    if ($branch -and $branch -ne 'main') {
        $commitsAhead = @(& git log main..HEAD --oneline --no-decorate 2>$null) |
            Select-Object -First 10
    }
    $dirty = @(& git status --porcelain 2>$null).Count
} finally {
    Pop-Location
}

# --- Listening dev ports -----------------------------------------------------
# Vite 5173-5199, backend 3000-3099, specialized 8091 (port-manager)
$portsToCheck = @(3001, 3002, 5173, 5174, 5175, 5177, 8091)
$ports = @()
foreach ($p in $portsToCheck) {
    $listening = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        $owningPid = $listening[0].OwningProcess
        $procName  = (Get-Process -Id $owningPid -ErrorAction SilentlyContinue).Name
        $ports += [pscustomobject]@{
            port    = $p
            pid     = $owningPid
            process = $procName
        }
    }
}

# --- Emit --------------------------------------------------------------------
$out = [pscustomobject]@{
    date         = (Get-Date -Format 'yyyy-MM-dd')
    day          = (Get-Date -Format 'dddd')
    branch       = $branch
    currentFocus = $focus
    commitsAhead = @($commitsAhead)
    dirtyFiles   = $dirty
    ports        = @($ports)
    recent       = @($recent)
}
$out | ConvertTo-Json -Depth 6
