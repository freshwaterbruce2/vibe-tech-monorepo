$ErrorActionPreference = 'Stop'

param(
    [string]$ServiceName = 'ipc-bridge',
    [string]$NssmPath = 'nssm.exe'
)

$nssmCandidates = @(
    (Get-Command $NssmPath -ErrorAction SilentlyContinue)?.Source,
    'C:\Program Files\nssm\nssm.exe',
    'C:\Program Files (x86)\nssm\nssm.exe'
)
$nssm = $nssmCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $nssm) {
    throw "nssm.exe was not found. Install NSSM or pass -NssmPath explicitly."
}

& $nssm stop $ServiceName | Out-Null
& $nssm remove $ServiceName confirm | Out-Null

Write-Host "Removed Windows service '$ServiceName'." -ForegroundColor Green
