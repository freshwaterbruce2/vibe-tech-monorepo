#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Monitors development processes for memory leaks and recycles them.
.DESCRIPTION
    Scans specified dev processes (node, electron, cargo, etc.) and recycles them
    if their memory usage exceeds a configured threshold, dynamically checking
    for open ports to automatically trigger restart scripts.
.PARAMETER MemoryThresholdMB
    Memory limit in Megabytes before recycling a process (default: 2048).
.PARAMETER ProcessNames
    Array of process names to monitor (default: node, electron, cargo).
.PARAMETER PollIntervalSeconds
    Seconds to sleep between scans (default: 30).
.EXAMPLE
    pwsh -File scripts/Monitor-DevServices.ps1 -MemoryThresholdMB 1024
#>

[CmdletBinding()]
param(
    [int]$MemoryThresholdMB = 2048,
    [string[]]$ProcessNames = @("node", "electron", "cargo"),
    [int]$PollIntervalSeconds = 30
)

$ErrorActionPreference = "Stop"
$watcherLogDir = "D:\logs\port-watcher"
$monitorLog = Join-Path $watcherLogDir "process-monitor.log"
$alertLogJson = Join-Path $watcherLogDir "process-alerts.json"

# Port to restart command mapping
$PortRestartMap = @{
    "3001" = "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File V:\monorepo\scripts\restart-proxy.ps1"
    "3000" = "pnpm nx dev api"
    "5173" = "pnpm nx dev vibe-code-studio"
}

# Ensure directory exists
if (-not (Test-Path $watcherLogDir)) {
    New-Item -ItemType Directory -Path $watcherLogDir -Force | Out-Null
}

function Write-MonitorLog {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $formatted = "[$stamp] $Message"
    Write-Host $formatted -ForegroundColor $Color
    $formatted | Out-File -FilePath $monitorLog -Append -Encoding utf8
}

function Get-ProcessPorts {
    param([int]$ProcessId)
    try {
        # Check active connections belonging to this process ID
        $connections = Get-NetTCPConnection -ErrorAction SilentlyContinue | 
            Where-Object { $_.OwningProcess -eq $ProcessId }
        
        if ($connections) {
            return @($connections | Select-Object -ExpandProperty LocalPort -Unique)
        }
    } catch {
        # Ignore errors if connections query fails
    }
    return @()
}

function Recycle-Process {
    param(
        [object]$Process,
        [double]$CurrentMemoryMB
    )

    $procName = $Process.Name
    $procId = $Process.Id
    
    # Check if there are open ports associated with this process before killing it
    $associatedPorts = Get-ProcessPorts -ProcessId $procId
    $portsString = if ($associatedPorts) { $associatedPorts -join ", " } else { "None" }

    Write-MonitorLog "[WARN] Process $procName ($procId) exceeds memory limit ($CurrentMemoryMB MB > $MemoryThresholdMB MB). Associated Ports: $portsString" -Color Yellow

    # Log alert to JSON
    $alertRecord = [ordered]@{
        timestamp = (Get-Date).ToString("s")
        processName = $procName
        processId = $procId
        memoryMB = $CurrentMemoryMB
        limitMB = $MemoryThresholdMB
        ports = $associatedPorts
        remedy = "terminate_and_restart"
    }
    $jsonAlert = $alertRecord | ConvertTo-Json -Compress
    $jsonAlert | Out-File -FilePath $alertLogJson -Append -Encoding utf8

    # Step 1: Force terminate process
    Write-MonitorLog "  Step 1: Terminating process $procName (PID: $procId) forcing release..." -Color Red
    try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Start-Sleep -Seconds 3
    } catch {
        Write-MonitorLog "  [ERROR] Failed to stop process: $_" -Color Red
        return
    }

    # Step 2: Auto-restart services associated with the ports
    foreach ($port in $associatedPorts) {
        $portKey = [string]$port
        if ($PortRestartMap.ContainsKey($portKey)) {
            $cmd = $PortRestartMap[$portKey]
            Write-MonitorLog "  Step 2: Restarting service for port $port via command: $cmd" -Color Cyan
            try {
                $parts = $cmd -split " ", 2
                $exec = $parts[0]
                $args = if ($parts.Length -gt 1) { $parts[1] } else { "" }
                
                Start-Process -FilePath $exec -ArgumentList $args -WorkingDirectory "V:\monorepo" -WindowStyle Minimized
                Write-MonitorLog "  [OK] Restart command executed successfully." -Color Green
            } catch {
                Write-MonitorLog "  [ERROR] Failed to execute restart command: $_" -Color Red
            }
        } else {
            Write-MonitorLog "  No auto-restart mapping registered for port $port." -Color Yellow
        }
    }
}

function Is-MonorepoProcess {
    param([object]$Process)
    try {
        # Check if file path belongs to monorepo or standard user profile tooling
        $execPath = $Process.Path
        if ($null -eq $execPath) { return $false }
        
        return ($execPath -like "*monorepo*" -or $execPath -like "*fresh_zxae3v6*")
    } catch {
        # Throws exception for system processes due to permissions
        return $false
    }
}

# --- MAIN WATCHER LOOP ---
Write-MonitorLog "[START] Dev Services Process Monitor initialized." -Color Green
Write-MonitorLog "  Targets: $($ProcessNames -join ', ')" -Color Cyan
Write-MonitorLog "  Memory Limit: $MemoryThresholdMB MB" -Color Cyan
Write-MonitorLog "  Poll Interval: ${PollIntervalSeconds}s" -Color Cyan
Write-MonitorLog "  Press Ctrl+C to stop." -Color DarkGray

while ($true) {
    foreach ($name in $ProcessNames) {
        $processes = Get-Process -Name $name -ErrorAction SilentlyContinue
        foreach ($proc in $processes) {
            # Bounded verification: only monitor user/monorepo processes
            if (-not (Is-MonorepoProcess -Process $proc)) {
                continue
            }

            try {
                $memMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
                if ($memMB -gt $MemoryThresholdMB) {
                    Recycle-Process -Process $proc -CurrentMemoryMB $memMB
                }
            } catch {
                # Process might have already exited between lookup and check
            }
        }
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}
