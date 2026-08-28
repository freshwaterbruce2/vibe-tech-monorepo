#!/usr/bin/env pwsh
# Helper: register an active LATS node before invoking a sub-agent.
# The lats-backpropagate.ps1 hook reads this file after the Agent call completes.
#
# Usage:
#   .\lats-register-node.ps1 -NodeId "be2debad-..." -Approach "Search-first: ..."
#
# Called by the skill-orchestrator before each sub-agent invocation.

param(
    [Parameter(Mandatory=$true)]
    [string]$NodeId,

    [string]$Approach = "",
    [string]$TaskDescription = ""
)

$ErrorActionPreference = 'Stop'

$stateDir = 'D:\learning-system'
if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

$state = @{
    nodeId          = $NodeId
    approach        = $Approach
    taskDescription = $TaskDescription
    registeredAt    = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
}

$state | ConvertTo-Json | Out-File -FilePath "$stateDir\lats-active-node.json" -Encoding UTF8 -Force

Write-Host "LATS: registered active node $NodeId" -ForegroundColor Cyan
