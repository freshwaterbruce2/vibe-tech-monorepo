param(
    [string]$PythonPath = "python",
    [string]$NovaRoot = "C:\\dev\\apps\\nova-agent",
    [string]$LogDir = "D:\\logs\\nova-agent",
    [string]$TaskName = "NovaAgentSupervisor"
)

$scriptPath = Join-Path $NovaRoot "tools\\live_launch.py"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Supervisor script not found: $scriptPath"
    exit 1
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$cmd = "`"$PythonPath`" `"$scriptPath`" --log-dir `"$LogDir`" --kill-dupes"

schtasks /Create /F /SC ONLOGON /TN $TaskName /TR $cmd | Out-Null
Write-Host "Scheduled task '$TaskName' created. It will start at user logon."
