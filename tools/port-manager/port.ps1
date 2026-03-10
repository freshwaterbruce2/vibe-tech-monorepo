#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick port management utility

.DESCRIPTION
    Usage:
        port check <port>      - Check if port is in use
        port kill <port>       - Kill process on port
        port list              - Show all registered ports and status
        port clear [type]      - Kill all dev servers (optionally filter by type)
        port find [start] [end]- Find a free port in range

.EXAMPLE
    port check 8091
    port kill 8091
    port list
    port clear vite
#>

param(
    [Parameter(Position=0)]
    [string]$Action,

    [Parameter(Position=1)]
    [string]$Arg1,

    [Parameter(Position=2)]
    [string]$Arg2
)

# Import the module
$modulePath = Join-Path $PSScriptRoot "PortManager.psm1"
Import-Module $modulePath -Force

switch ($Action) {
    "check" {
        if (-not $Arg1) {
            Write-Host "Usage: port check <port>" -ForegroundColor Yellow
            exit 1
        }
        $status = Get-PortStatus -Port ([int]$Arg1)
        if ($status.InUse) {
            Write-Host "Port $Arg1 is IN USE" -ForegroundColor Red
            Write-Host "  Process: $($status.ProcessName)" -ForegroundColor Cyan
            Write-Host "  PID: $($status.ProcessId)" -ForegroundColor Cyan
        } else {
            Write-Host "Port $Arg1 is FREE" -ForegroundColor Green
        }
    }

    "kill" {
        if (-not $Arg1) {
            Write-Host "Usage: port kill <port>" -ForegroundColor Yellow
            exit 1
        }
        Stop-PortProcess -Port ([int]$Arg1) -Force
    }

    "list" {
        Write-Host "`nVibeTech Port Registry Status`n" -ForegroundColor Cyan
        Get-AllPortStatus | Format-Table -AutoSize
    }

    "clear" {
        Clear-DevPorts -Type $Arg1
    }

    "find" {
        $start = if ($Arg1) { [int]$Arg1 } else { 5173 }
        $end = if ($Arg2) { [int]$Arg2 } else { 5199 }
        $free = Find-FreePort -Start $start -End $end
        if ($free) {
            Write-Host "Free port found: $free" -ForegroundColor Green
        } else {
            Write-Host "No free ports in range $start-$end" -ForegroundColor Red
        }
    }

    default {
        Write-Host @"

VibeTech Port Manager
=====================

Usage:
  port check <port>       Check if port is in use
  port kill <port>        Kill process on port
  port list               Show all registered ports and status
  port clear [type]       Kill all dev servers (type: vite|backend|mcp|python)
  port find [start] [end] Find a free port in range (default: 5173-5199)

Examples:
  port check 8091         # Check if Vibe-Eyes port is in use
  port kill 8091          # Free up port 8091
  port list               # See all registered ports
  port clear vite         # Kill all Vite dev servers
  port find 3000 3099     # Find free port in backend range

"@ -ForegroundColor Cyan
    }
}
