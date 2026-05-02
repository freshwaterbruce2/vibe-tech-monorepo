<#
.SYNOPSIS
  Repairs the local process environment, starts OpenClaw gateway recovery, and
  prints a verified dashboard URL.

.DESCRIPTION
  This is the workspace-level OpenClaw recovery entry point for C:\dev. It keeps
  the existing Control UI patch script as the owner of bundled UI edits, then
  verifies the local loopback gateway before printing or opening browser mode.
#>
[CmdletBinding()]
param(
    [int]$GatewayPort = 18789,
    [int]$BrowserPort = 0,
    [int]$ReadyTimeoutSeconds = 150,
    [switch]$OpenDashboard,
    [switch]$SkipControlUiPatch,
    [switch]$VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')
$environmentScript = Join-Path $repoRoot 'scripts\Initialize-DevProcessEnvironment.ps1'
$controlUiPatchScript = Join-Path $PSScriptRoot 'Apply-ControlUiLocalFixes.ps1'

if (-not (Test-Path -LiteralPath $environmentScript -PathType Leaf)) {
    throw "Missing environment repair script: $environmentScript"
}

. $environmentScript
Initialize-DevProcessEnvironment | Out-Null
$scriptStartedAt = Get-Date

if ($BrowserPort -le 0) {
    $BrowserPort = $GatewayPort
}

function Invoke-OpenClaw {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [switch]$AllowFailure,
        [switch]$Quiet
    )

    if ($Quiet) {
        & openclaw @ArgumentList *> $null
    } else {
        & openclaw @ArgumentList
    }
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }

    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "openclaw $($ArgumentList -join ' ') failed with exit code $exitCode."
    }

    if ($AllowFailure) {
        return $exitCode
    }
}

function Get-OpenClawGatewayCommandPath {
    $userProfile = [Environment]::GetFolderPath('UserProfile')
    if ([string]::IsNullOrWhiteSpace($userProfile)) {
        return $null
    }

    return Join-Path $userProfile '.openclaw\gateway.cmd'
}

function Set-OpenClawGatewayLocalEnvironment {
    param([switch]$VerifyOnly)

    if ($GatewayPort -ne 18789) {
        return $false
    }

    $gatewayCommandPath = Get-OpenClawGatewayCommandPath
    if ([string]::IsNullOrWhiteSpace($gatewayCommandPath) -or
        -not (Test-Path -LiteralPath $gatewayCommandPath -PathType Leaf)) {
        if ($VerifyOnly) {
            throw "Verification failed: OpenClaw gateway service wrapper is missing."
        }

        return $false
    }

    $content = [IO.File]::ReadAllText($gatewayCommandPath, [Text.UTF8Encoding]::new($false))
    if ($content -match '(?m)^set "OPENCLAW_DISABLE_BONJOUR=1"\s*$') {
        return $false
    }

    if ($VerifyOnly) {
        throw "Verification failed: gateway.cmd is missing OPENCLAW_DISABLE_BONJOUR=1."
    }

    $lineToAdd = 'set "OPENCLAW_DISABLE_BONJOUR=1"'
    $pattern = '(?m)^set "OPENCLAW_SERVICE_VERSION=[^"]*"\s*$'
    $match = [regex]::Match($content, $pattern)
    if (-not $match.Success) {
        throw "Could not find OpenClaw service environment block in $gatewayCommandPath."
    }

    $updated = $content.Insert(
        $match.Index + $match.Length,
        [Environment]::NewLine + $lineToAdd
    )
    [IO.File]::WriteAllText($gatewayCommandPath, $updated, [Text.UTF8Encoding]::new($false))
    Write-Host "[openclaw] Applied gateway service env fix: OPENCLAW_DISABLE_BONJOUR=1"
    return $true
}

function Test-OpenClawGateway {
    $gatewayUrl = "ws://127.0.0.1:$GatewayPort"
    $exitCode = Invoke-OpenClaw -ArgumentList @(
        'gateway',
        'probe',
        '--url',
        $gatewayUrl,
        '--timeout',
        '15000'
    ) -AllowFailure -Quiet
    return $exitCode -eq 0
}

function Test-OpenClawGatewayPort {
    param([int]$Port = $GatewayPort)

    $client = $null
    try {
        $client = [Net.Sockets.TcpClient]::new()
        $asyncResult = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        $connected = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($connected) {
            $client.EndConnect($asyncResult)
        }

        return $connected -and $client.Connected
    } catch {
        return $false
    } finally {
        if ($client) {
            $client.Dispose()
        }
    }
}

function Wait-OpenClawGateway {
    param([int]$TimeoutSeconds)

    $deadline = [DateTimeOffset]::Now.AddSeconds($TimeoutSeconds)
    do {
        if (Test-OpenClawGateway) {
            return $true
        }

        Start-Sleep -Seconds 2
    } while ([DateTimeOffset]::Now -lt $deadline)

    return $false
}

function Wait-OpenClawGatewayPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds
    )

    $deadline = [DateTimeOffset]::Now.AddSeconds($TimeoutSeconds)
    do {
        if (Test-OpenClawGatewayPort -Port $Port) {
            return $true
        }

        Start-Sleep -Seconds 2
    } while ([DateTimeOffset]::Now -lt $deadline)

    return $false
}

function Test-OpenClawGatewayReadyLog {
    param([Nullable[datetime]]$Since)

    $systemDrive = $env:SystemDrive
    if ([string]::IsNullOrWhiteSpace($systemDrive)) {
        $systemDrive = Split-Path -Qualifier $env:SystemRoot
    }
    if ([string]::IsNullOrWhiteSpace($systemDrive)) {
        $systemDrive = 'C:'
    }

    $logRoot = Join-Path $systemDrive 'tmp\openclaw'
    if (-not (Test-Path -LiteralPath $logRoot -PathType Container)) {
        return $false
    }

    $latestLog = Get-ChildItem -LiteralPath $logRoot -Filter 'openclaw-*.log' -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestLog) {
        return $false
    }

    if ($Since -and $latestLog.LastWriteTime -lt $Since.AddSeconds(-5)) {
        return $false
    }

    return [bool](Select-String -LiteralPath $latestLog.FullName -Pattern '\[gateway\]\s+ready|gateway.*ready' -Quiet)
}

function Start-OpenClawGatewayForegroundHost {
    $escapedRepoRoot = $repoRoot.Path.Replace("'", "''")
    $escapedEnvironmentScript = $environmentScript.Replace("'", "''")
    $command = @"
Set-Location -LiteralPath '$escapedRepoRoot'
. '$escapedEnvironmentScript'
Initialize-DevProcessEnvironment | Out-Null
`$env:OPENCLAW_DISABLE_BONJOUR = '1'
openclaw gateway run --port $GatewayPort
"@

    Start-Process `
        -FilePath 'pwsh' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) `
        -WorkingDirectory $repoRoot.Path `
        -WindowStyle Hidden | Out-Null
}

if (-not $SkipControlUiPatch) {
    if (-not (Test-Path -LiteralPath $controlUiPatchScript -PathType Leaf)) {
        throw "Missing Control UI patch script: $controlUiPatchScript"
    }

    if ($VerifyOnly) {
        & $controlUiPatchScript -VerifyOnly
    } else {
        & $controlUiPatchScript
    }
}

Set-OpenClawGatewayLocalEnvironment -VerifyOnly:$VerifyOnly | Out-Null

if ($VerifyOnly) {
    $gatewayUrl = "ws://127.0.0.1:$GatewayPort"
    if (-not (Test-OpenClawGateway)) {
        $null = Invoke-OpenClaw -ArgumentList @(
            'gateway',
            'status',
            '--url',
            $gatewayUrl,
            '--timeout',
            '15000',
            '--require-rpc'
        ) -AllowFailure
        throw "OpenClaw gateway probe failed for $gatewayUrl."
    }

    Invoke-OpenClaw -ArgumentList @(
        'gateway',
        'status',
        '--url',
        $gatewayUrl,
        '--timeout',
        '15000',
        '--require-rpc'
    )
    Invoke-OpenClaw -ArgumentList @('health', '--timeout', '15000', '--json')
    Invoke-OpenClaw -ArgumentList @('agents', 'list')
    Invoke-OpenClaw -ArgumentList @('dashboard', '--no-open')
    return
}

$startedGateway = $false
if (-not (Test-OpenClawGateway)) {
    $gatewayCommandPath = Get-OpenClawGatewayCommandPath
    if ($GatewayPort -eq 18789 -and
        ([string]::IsNullOrWhiteSpace($gatewayCommandPath) -or
            -not (Test-Path -LiteralPath $gatewayCommandPath -PathType Leaf))) {
        Write-Host "[openclaw] Gateway service wrapper is missing; reinstalling service..."
        Invoke-OpenClaw -ArgumentList @(
            'gateway',
            'install',
            '--force',
            '--port',
            "$GatewayPort",
            '--runtime',
            'node'
        )
        Set-OpenClawGatewayLocalEnvironment | Out-Null
    }

    if (-not (Test-OpenClawGatewayPort -Port $GatewayPort)) {
        Write-Host "[openclaw] Gateway is not listening on ws://127.0.0.1:$GatewayPort; starting service..."
        if ($GatewayPort -eq 18789) {
            Invoke-OpenClaw -ArgumentList @('gateway', 'start')
            $startedGateway = $true
        } else {
            Write-Host "[openclaw] gateway start uses the configured service port; starting a foreground host for custom port $GatewayPort..."
            Start-OpenClawGatewayForegroundHost
            $startedGateway = $true
        }
    } elseif ($GatewayPort -eq 18789) {
        Write-Host "[openclaw] Gateway port is listening but probe/RPC failed; restarting service..."
        Invoke-OpenClaw -ArgumentList @('gateway', 'stop') -AllowFailure | Out-Null
        Set-OpenClawGatewayLocalEnvironment | Out-Null
        Invoke-OpenClaw -ArgumentList @('gateway', 'start')
        $startedGateway = $true
    }

    if (-not (Wait-OpenClawGatewayPort -Port $GatewayPort -TimeoutSeconds $ReadyTimeoutSeconds)) {
        Write-Host "[openclaw] Service start did not become reachable; starting a repaired foreground host..."
        Start-OpenClawGatewayForegroundHost
        $startedGateway = $true

        if (-not (Wait-OpenClawGatewayPort -Port $GatewayPort -TimeoutSeconds $ReadyTimeoutSeconds)) {
            throw "OpenClaw gateway did not become reachable on ws://127.0.0.1:$GatewayPort."
        }
    }

    $readySince = if ($startedGateway) { $scriptStartedAt } else { $null }
    if (-not (Wait-OpenClawGateway -TimeoutSeconds $ReadyTimeoutSeconds)) {
        $null = Invoke-OpenClaw -ArgumentList @(
            'gateway',
            'status',
            '--url',
            "ws://127.0.0.1:$GatewayPort",
            '--timeout',
            '15000',
            '--require-rpc'
        ) -AllowFailure
        if (Test-OpenClawGatewayReadyLog -Since $readySince) {
            Write-Warning "The latest OpenClaw log reports ready, but gateway probe/RPC verification failed."
        }

        throw "OpenClaw gateway is listening on ws://127.0.0.1:$GatewayPort, but probe/RPC verification failed."
    }
}

if ($BrowserPort -ne $GatewayPort) {
    Write-Warning "OpenClaw dashboard is served by the gateway; ignoring BrowserPort $BrowserPort and using $GatewayPort."
    $BrowserPort = $GatewayPort
}

if (-not (Wait-OpenClawGatewayPort -Port $GatewayPort -TimeoutSeconds $ReadyTimeoutSeconds)) {
    throw "OpenClaw dashboard did not become reachable on http://127.0.0.1:$GatewayPort/."
}

$gatewayUrl = "ws://127.0.0.1:$GatewayPort"
Invoke-OpenClaw -ArgumentList @(
    'gateway',
    'status',
    '--url',
    $gatewayUrl,
    '--timeout',
    '15000',
    '--require-rpc'
)
Invoke-OpenClaw -ArgumentList @('health', '--timeout', '15000', '--json')
Invoke-OpenClaw -ArgumentList @('agents', 'list')

if ($OpenDashboard) {
    Invoke-OpenClaw -ArgumentList @('dashboard')
} else {
    Invoke-OpenClaw -ArgumentList @('dashboard', '--no-open')
}
