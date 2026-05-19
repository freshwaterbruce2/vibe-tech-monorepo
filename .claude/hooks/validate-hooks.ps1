#!/usr/bin/env powershell
# Hook Validation Script
# Validates the active Claude Code hook configuration without executing hooks.

param(
    [switch]$Verbose
)

$ErrorActionPreference = 'Continue'

Write-Host "`n=== Claude Code Hook Validation ===" -ForegroundColor Cyan

$settingsPath = '.claude/settings.json'
$failed = $false

if (-not (Test-Path -LiteralPath $settingsPath)) {
    Write-Host "FAIL settings file missing: $settingsPath" -ForegroundColor Red
    exit 1
}

try {
    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json -ErrorAction Stop
    Write-Host "OK settings.json parses" -ForegroundColor Green
} catch {
    Write-Host "FAIL settings.json does not parse: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/4] Checking configured hook files..." -ForegroundColor Yellow
$hookRows = @()
foreach ($event in $settings.hooks.PSObject.Properties.Name) {
    foreach ($entry in $settings.hooks.$event) {
        foreach ($hook in $entry.hooks) {
            $command = [string]$hook.command
            if ($command -match '-File\s+([^\s]+)') {
                $path = $Matches[1]
                $shell = if ($command -match '^\s*([^\s]+)') { $Matches[1] } else { 'powershell' }
                $exists = Test-Path -LiteralPath $path
                $resolvedPath = if ($exists) { (Resolve-Path -LiteralPath $path).Path } else { $path }
                $hookRows += [pscustomobject]@{
                    Event = $event
                    Matcher = $entry.matcher
                    Shell = $shell
                    Path = $resolvedPath
                    Exists = $exists
                }
                if ($exists) {
                    Write-Host "  OK $event $path" -ForegroundColor Green
                } else {
                    Write-Host "  FAIL $event $path missing" -ForegroundColor Red
                    $failed = $true
                }
            }
        }
    }
}

if ($hookRows.Count -eq 0) {
    Write-Host '  FAIL no command hooks found in settings.json' -ForegroundColor Red
    $failed = $true
}

Write-Host "`n[2/4] Checking PowerShell syntax..." -ForegroundColor Yellow
foreach ($row in $hookRows | Where-Object { $_.Exists }) {
    $parseCommand = @'
$Path = $env:CODEX_HOOK_PARSE_PATH
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $Path,
    [ref]$tokens,
    [ref]$parseErrors
) | Out-Null

if ($parseErrors -and $parseErrors.Count -gt 0) {
    foreach ($parseError in $parseErrors) {
        Write-Output ("{0}: {1}" -f $parseError.Extent.StartLineNumber, $parseError.Message)
    }
    exit 1
}
exit 0
'@

    $env:CODEX_HOOK_PARSE_PATH = $row.Path
    try {
        $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($parseCommand))
        $parseOutput = & $row.Shell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encodedCommand 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  FAIL $($row.Path)" -ForegroundColor Red
            foreach ($parseLine in $parseOutput) {
                Write-Host "    $parseLine" -ForegroundColor Red
            }
            $failed = $true
        } else {
            Write-Host "  OK $($row.Path) ($($row.Shell))" -ForegroundColor Green
        }
    } finally {
        Remove-Item Env:\CODEX_HOOK_PARSE_PATH -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[3/4] Checking status line command..." -ForegroundColor Yellow
if ($settings.statusLine.command -match '-File\s+([^\s]+)') {
    $statusPath = $Matches[1]
    if (Test-Path -LiteralPath $statusPath) {
        Write-Host "  OK $statusPath" -ForegroundColor Green
    } else {
        Write-Host "  FAIL $statusPath missing" -ForegroundColor Red
        $failed = $true
    }
} else {
    Write-Host '  WARN statusLine command does not use a -File path' -ForegroundColor Yellow
}

Write-Host "`n[4/4] Checking learning database path..." -ForegroundColor Yellow
$dbPath = 'D:\databases\agent_learning.db'
if (Test-Path -LiteralPath $dbPath) {
    Write-Host "  OK $dbPath exists" -ForegroundColor Green
} else {
    Write-Host "  WARN $dbPath not found; hooks will run but learning writes may be skipped" -ForegroundColor Yellow
}

if ($Verbose) {
    Write-Host "`nConfigured hooks:" -ForegroundColor Cyan
    $hookRows | Format-Table -AutoSize
}

Write-Host "`n=== Validation Complete ===" -ForegroundColor Cyan
if ($failed) { exit 1 }
exit 0
