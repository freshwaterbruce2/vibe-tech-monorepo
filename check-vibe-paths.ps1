#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$FixPermissions
)

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'scripts\check-vibe-paths.ps1') @PSBoundParameters
