#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Real-time log watcher and port conflict self-healer sidecar.
.DESCRIPTION
    Tails log files in D:\logs\ using byte offsets. Detects port conflicts (EADDRINUSE),
    kills the offending process using the workspace port utility, and restarts the service.
.EXAMPLE
    pwsh -File scripts/Watch-PortsAndLogs.ps1
#>

[CmdletBinding()]
param(
    [string]$LogDirectory = "D:\logs",
    [int]$PollIntervalSeconds = 2,
    [switch]$SkipNotify
)

$ErrorActionPreference = "Stop"
$watcherLogDir = "D:\logs\port-watcher"
$activityLog = Join-Path $watcherLogDir "activity.log"
$alertLogJson = Join-Path $watcherLogDir "alerts.json"
$portUtility = "V:\monorepo\tools\port-manager\port.ps1"

# Map ports to restart commands or scripts
$PortRestartMap = @{
    "3001" = "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File V:\monorepo\scripts\restart-proxy.ps1"
    "3000" = "pnpm nx dev api"
    "5173" = "pnpm nx dev vibe-code-studio"
}

# Ensure directory structures exist
if (-not (Test-Path $watcherLogDir)) {
    New-Item -ItemType Directory -Path $watcherLogDir -Force | Out-Null
}
if (-not (Test-Path $LogDirectory)) {
    New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
}

# Tracking state for log files: FilePath -> LastReadOffset
$LogState = @{}

function Write-WatcherLog {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$stamp] $Message"
    Write-Host $formatted -ForegroundColor $Color
    $formatted | Out-File -FilePath $activityLog -Append -Encoding utf8
}

function Invoke-PortSelfHealing {
    param(
        [int]$Port,
        [string]$TriggerLine,
        [string]$SourceFile
    )

    Write-WatcherLog "🚨 ALERT: Port conflict detected on port $Port in log: $SourceFile" -Color Red
    Write-WatcherLog "  Trigger line: $TriggerLine" -Color DarkGray

    # Log to alerts.json
    $alertRecord = [ordered]@{
        timestamp = (Get-Date).ToString("s")
        port = $Port
        sourceFile = $SourceFile
        triggerLine = $TriggerLine
        remedy = "kill_and_restart"
    }
    $jsonAlert = $alertRecord | ConvertTo-Json -Compress
    $jsonAlert | Out-File -FilePath $alertLogJson -Append -Encoding utf8

    # Step 1: Kill process occupying the port
    Write-WatcherLog "  Step 1: Terminating process occupying port $Port..." -Color Yellow
    try {
        & $portUtility kill $Port
        Start-Sleep -Seconds 2
    } catch {
        Write-WatcherLog "  Failed to kill port process: $_" -Color Red
    }

    # Step 2: Restart the service using the map
    $portKey = [string]$Port
    if ($PortRestartMap.ContainsKey($portKey)) {
        $cmd = $PortRestartMap[$portKey]
        Write-WatcherLog "  Step 2: Restarting service via command: $cmd" -Color Cyan
        try {
            # Start process in background
            $parts = $cmd -split " ", 2
            $exec = $parts[0]
            $args = if ($parts.Length -gt 1) { $parts[1] } else { "" }
            
            Start-Process -FilePath $exec -ArgumentList $args -WorkingDirectory "V:\monorepo" -WindowStyle Minimized
            Write-WatcherLog "  Service restart initiated successfully." -Color Green
        } catch {
            Write-WatcherLog "  Failed to restart service: $_" -Color Red
        }
    } else {
        Write-WatcherLog "  No restart command registered for port $Port. Manual restart required." -Color Yellow
    }
}

function Scan-LogLine {
    param(
        [string]$Line,
        [string]$FilePath
    )

    # Check for EADDRINUSE or address already in use
    if ($Line -match "EADDRINUSE" -or $Line -match "address already in use" -or $Line -match "port already in use") {
        # Attempt to extract port number
        # Matches formats: "port: 3001", "port 3001", "3001", ":::3001"
        $port = $null
        if ($Line -match "\b(?<port>\d{4,5})\b") {
            $port = [int]$Matches["port"]
        } elseif ($FilePath -like "*openrouter-proxy*") {
            $port = 3001
        } elseif ($FilePath -like "*symptom-tracker-api*" -or $FilePath -like "*api*") {
            $port = 3000
        }

        if ($port) {
            Invoke-PortSelfHealing -Port $port -TriggerLine $Line.Trim() -SourceFile $FilePath
        }
    }
}

function Process-LogFile {
    param([string]$FilePath)

    try {
        $file = Get-Item -LiteralPath $FilePath
        $offset = if ($LogState.ContainsKey($FilePath)) { $LogState[$FilePath] } else { 0 }
        $fileSize = $file.Length

        # If file was truncated or rotated
        if ($fileSize -lt $offset) {
            $offset = 0
            Write-WatcherLog "Log file rotated/truncated: $FilePath" -Color Gray
        }

        # If there are new bytes to read
        if ($fileSize -gt $offset) {
            $stream = [System.IO.File]::Open($FilePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            $null = $stream.Seek($offset, [System.IO.SeekOrigin]::Begin)
            
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            while ($line = $reader.ReadLine()) {
                Scan-LogLine -Line $line -FilePath $FilePath
            }
            
            # Update tracking offset
            $LogState[$FilePath] = $stream.Position
            $reader.Close()
            $stream.Close()
        }
    } catch {
        Write-WatcherLog "Error reading ${FilePath}: $($_.Exception.Message)" -Color Red
    }
}

# --- MAIN LOOP ---
Write-WatcherLog "🚀 VibeTech Port-Watcher Sidecar initialized." -Color Green
Write-WatcherLog "  Monitoring log directory: $LogDirectory" -Color Cyan
Write-WatcherLog "  Polling frequency: ${PollIntervalSeconds}s" -Color Cyan
Write-WatcherLog "  Press Ctrl+C to terminate." -Color DarkGray

while ($true) {
    # Scan for all .log files recursively in D:\logs (except the watcher's own logs)
    $logFiles = Get-ChildItem -Path $LogDirectory -Recurse -File -Filter "*.log" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike "*port-watcher*" }

    foreach ($logFile in $logFiles) {
        Process-LogFile -FilePath $logFile.FullName
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}
