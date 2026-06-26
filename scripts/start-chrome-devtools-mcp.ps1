#Requires -Version 5.1
<#
.SYNOPSIS
  Launches Chrome with remote debugging enabled (if not already running) and
  starts the chrome-devtools-mcp server connected to it.

.DESCRIPTION
  This wrapper makes chrome-devtools-mcp self-contained: it does not require the
  user to manually start Chrome with --remote-debugging-port. It uses a dedicated
  user-data-dir so it does not conflict with the user's normal Chrome profile.
#>

$ErrorActionPreference = 'Stop'

$chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$debugPort = 9222
$userDataDir = Join-Path $env:LOCALAPPDATA 'chrome-devtools-mcp-profile'
$logFile = Join-Path $env:LOCALAPPDATA 'chrome-devtools-mcp-launcher.log'
$npxPath = 'C:\Users\fresh_zxae3v6\AppData\Roaming\fnm\aliases\default\npx.cmd'

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts $Message" | Out-File -FilePath $logFile -Append -Encoding utf8
}

function Test-DebugPortOpen {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Get-ChromeProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        return Get-Process -Id $connections[0].OwningProcess -ErrorAction SilentlyContinue
    }
    return $null
}

Write-Log 'Starting chrome-devtools-mcp wrapper...'

# Ensure the dedicated profile directory exists.
if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
}

# If nothing is listening on the debug port, launch Chrome with remote debugging.
if (-not (Test-DebugPortOpen -Port $debugPort)) {
    Write-Log "Port $debugPort not open; launching Chrome with remote debugging."

    if (-not (Test-Path $chromePath)) {
        Write-Log "ERROR: Chrome not found at $chromePath"
        throw "Chrome not found at $chromePath. Please install Chrome or update `$chromePath` in this script."
    }

    $chromeArgs = @(
        "--remote-debugging-port=$debugPort",
        "--user-data-dir=`"$userDataDir`"",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-default-apps",
        "about:blank"
    )

    Start-Process -FilePath $chromePath -ArgumentList $chromeArgs -WindowStyle Normal

    # Wait up to 15 seconds for the debug port to become available.
    $maxWait = 15
    $elapsed = 0
    while (-not (Test-DebugPortOpen -Port $debugPort) -and $elapsed -lt $maxWait) {
        Start-Sleep -Seconds 1
        $elapsed++
    }

    if (-not (Test-DebugPortOpen -Port $debugPort)) {
        Write-Log "ERROR: Chrome did not open debug port $debugPort within ${maxWait}s"
        throw "Chrome did not open debug port $debugPort within ${maxWait} seconds."
    }

    Write-Log "Chrome is listening on port $debugPort."
} else {
    Write-Log "Port $debugPort already open; reusing existing Chrome instance."
}

# Start chrome-devtools-mcp connected to the local debug port.
Write-Log 'Starting chrome-devtools-mcp...'

$env:CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS = '1'

& $npxPath -y chrome-devtools-mcp@latest `
    --autoConnect `
    --channel stable `
    --no-usage-statistics `
    --no-performance-crux
