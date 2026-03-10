#Requires -Version 5.1
<#
.SYNOPSIS
    VibeTech Port Manager - Utilities for managing dev server ports

.DESCRIPTION
    Provides functions to check port availability, kill processes on ports,
    and manage the port registry for the monorepo.
#>

$script:RegistryPath = Join-Path $PSScriptRoot "port-registry.json"

function Get-PortRegistry {
    <#
    .SYNOPSIS
        Get the port registry as a PowerShell object
    #>
    if (Test-Path $script:RegistryPath) {
        return Get-Content $script:RegistryPath | ConvertFrom-Json
    }
    return $null
}

function Get-PortStatus {
    <#
    .SYNOPSIS
        Check if a port is in use and get process info
    .PARAMETER Port
        The port number to check
    #>
    param(
        [Parameter(Mandatory)]
        [int]$Port
    )

    # Use netstat for more reliable results (Get-NetTCPConnection can be flaky)
    $netstatOutput = netstat -ano 2>$null | Select-String ":$Port\s" | Select-String "LISTENING"

    if ($netstatOutput) {
        # Parse the PID from netstat output (last column)
        $line = $netstatOutput | Select-Object -First 1
        if ($line -match '\s+(\d+)\s*$') {
            $pid = [int]$matches[1]
            if ($pid -gt 0) {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                return [PSCustomObject]@{
                    Port = $Port
                    InUse = $true
                    ProcessId = $pid
                    ProcessName = if ($process) { $process.ProcessName } else { "Unknown" }
                    State = "LISTENING"
                }
            }
        }
    }

    return [PSCustomObject]@{
        Port = $Port
        InUse = $false
        ProcessId = $null
        ProcessName = $null
        State = $null
    }
}

function Stop-PortProcess {
    <#
    .SYNOPSIS
        Kill the process using a specific port
    .PARAMETER Port
        The port number to free
    .PARAMETER Force
        Force kill without confirmation
    #>
    param(
        [Parameter(Mandatory)]
        [int]$Port,
        [switch]$Force
    )

    $status = Get-PortStatus -Port $Port
    if (-not $status.InUse) {
        Write-Host "Port $Port is already free" -ForegroundColor Green
        return $true
    }

    $registry = Get-PortRegistry
    $portInfo = $registry.ports."$Port"
    $appName = if ($portInfo) { $portInfo.app } else { "unknown" }

    if (-not $Force) {
        Write-Host "Port $Port is used by:" -ForegroundColor Yellow
        Write-Host "  Process: $($status.ProcessName) (PID: $($status.ProcessId))" -ForegroundColor Cyan
        Write-Host "  Registry: $appName" -ForegroundColor Cyan
        $confirm = Read-Host "Kill this process? [y/N]"
        if ($confirm -ne 'y' -and $confirm -ne 'Y') {
            Write-Host "Cancelled" -ForegroundColor Gray
            return $false
        }
    }

    try {
        Stop-Process -Id $status.ProcessId -Force
        Write-Host "Killed process $($status.ProcessName) (PID: $($status.ProcessId)) on port $Port" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Failed to kill process: $_" -ForegroundColor Red
        return $false
    }
}

function Get-AllPortStatus {
    <#
    .SYNOPSIS
        Check status of all registered ports
    #>
    $registry = Get-PortRegistry
    $results = @()

    foreach ($port in $registry.ports.PSObject.Properties.Name) {
        $status = Get-PortStatus -Port ([int]$port)
        $info = $registry.ports.$port
        $results += [PSCustomObject]@{
            Port = [int]$port
            App = $info.app
            Type = $info.type
            InUse = $status.InUse
            Process = $status.ProcessName
            PID = $status.ProcessId
        }
    }

    return $results | Sort-Object Port
}

function Clear-DevPorts {
    <#
    .SYNOPSIS
        Kill all dev server processes on registered ports
    .PARAMETER Type
        Filter by port type (vite, backend, mcp, python)
    #>
    param(
        [string]$Type
    )

    $registry = Get-PortRegistry
    $killed = 0

    foreach ($port in $registry.ports.PSObject.Properties.Name) {
        $info = $registry.ports.$port
        if ($Type -and $info.type -ne $Type) { continue }

        $status = Get-PortStatus -Port ([int]$port)
        if ($status.InUse) {
            Write-Host "Killing $($info.app) on port $port..." -ForegroundColor Yellow
            Stop-PortProcess -Port ([int]$port) -Force | Out-Null
            $killed++
        }
    }

    Write-Host "`nKilled $killed processes" -ForegroundColor Green
}

function Find-FreePort {
    <#
    .SYNOPSIS
        Find a free port in a given range
    .PARAMETER Start
        Start of port range
    .PARAMETER End
        End of port range
    #>
    param(
        [int]$Start = 5173,
        [int]$End = 5199
    )

    for ($port = $Start; $port -le $End; $port++) {
        $status = Get-PortStatus -Port $port
        if (-not $status.InUse) {
            return $port
        }
    }
    return $null
}

function Start-WithFreePort {
    <#
    .SYNOPSIS
        Ensure port is free before starting a command
    .PARAMETER Port
        The port to use
    .PARAMETER Command
        The command to run after freeing the port
    #>
    param(
        [Parameter(Mandatory)]
        [int]$Port,
        [Parameter(Mandatory)]
        [string]$Command
    )

    $status = Get-PortStatus -Port $Port
    if ($status.InUse) {
        Write-Host "Port $Port is in use by $($status.ProcessName). Killing..." -ForegroundColor Yellow
        Stop-PortProcess -Port $Port -Force | Out-Null
        Start-Sleep -Seconds 1
    }

    Write-Host "Starting: $Command" -ForegroundColor Green
    Invoke-Expression $Command
}

# Export functions
Export-ModuleMember -Function Get-PortRegistry, Get-PortStatus, Stop-PortProcess, Get-AllPortStatus, Clear-DevPorts, Find-FreePort, Start-WithFreePort
