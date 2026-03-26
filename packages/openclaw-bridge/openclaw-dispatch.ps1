#!/usr/bin/env pwsh
<#
.SYNOPSIS
    OpenClaw → Gateway Dispatcher CLI

.DESCRIPTION
    Wrapper script to run openclaw-dispatch from anywhere

.EXAMPLE
    .\openclaw-dispatch.ps1 ping
    .\openclaw-dispatch.ps1 call filesystem read_file --args '{"path":"./README.md"}'
#>

node "$PSScriptRoot\dist\cli.js" @args
