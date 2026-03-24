$ErrorActionPreference = 'Stop'

param(
    [string]$ServiceName = 'ipc-bridge',
    [int]$Port = 5004,
    [string]$BridgeSecret,
    [string]$NssmPath = 'nssm.exe'
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeCandidates = @(
    (Get-Command node -ErrorAction SilentlyContinue)?.Source,
    'C:\Users\fresh_zxae3v6\AppData\Roaming\fnm\aliases\default\node.exe',
    'C:\Program Files\nodejs\node.exe'
)
$nodePath = $nodeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$nssm = (Get-Command $NssmPath -ErrorAction SilentlyContinue)?.Source
$nssmCandidates = @(
    $nssm,
    'C:\Program Files\nssm\nssm.exe',
    'C:\Program Files (x86)\nssm\nssm.exe'
)
$nssm = $nssmCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$distScript = Join-Path $projectRoot 'dist\server.js'
$logDir = Join-Path $projectRoot 'logs'

if (-not $nssm) {
    throw "nssm.exe was not found. Install NSSM or pass -NssmPath explicitly."
}

if (-not (Test-Path $distScript)) {
    throw "Build output not found at $distScript. Run 'pnpm run build' first."
}

if ([string]::IsNullOrWhiteSpace($BridgeSecret)) {
    throw 'BridgeSecret is required. Pass -BridgeSecret to install the service securely.'
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

& $nssm stop $ServiceName | Out-Null
& $nssm remove $ServiceName confirm | Out-Null
& $nssm install $ServiceName $nodePath $distScript | Out-Null
& $nssm set $ServiceName AppDirectory $projectRoot | Out-Null
& $nssm set $ServiceName AppStdout (Join-Path $logDir "$ServiceName.out.log") | Out-Null
& $nssm set $ServiceName AppStderr (Join-Path $logDir "$ServiceName.err.log") | Out-Null
& $nssm set $ServiceName AppRotateFiles 1 | Out-Null
& $nssm set $ServiceName AppRotateOnline 1 | Out-Null
& $nssm set $ServiceName AppEnvironmentExtra "PORT=$Port" "BRIDGE_SECRET=$BridgeSecret" | Out-Null
& $nssm set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $nssm set $ServiceName AppExit Default Restart | Out-Null
& $nssm set $ServiceName AppThrottle 1500 | Out-Null
& $nssm start $ServiceName | Out-Null

Write-Host "Installed and started Windows service '$ServiceName'." -ForegroundColor Green
Write-Host "Port: $Port" -ForegroundColor Green
Write-Host "Logs: $logDir" -ForegroundColor Green
