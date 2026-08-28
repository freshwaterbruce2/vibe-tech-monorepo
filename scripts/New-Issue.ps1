#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Log a deferred issue to the Power Cell NATO issue tracker.

.DESCRIPTION
    Creates a JSON issue file in D:\databases\agent_issues\.
    Can be called manually, from a cell worker, or from Claude Code directly.

    Severity levels:
      critical  — system broken, immediate attention required
      high      — security or correctness defect, fix before next deploy
      medium    — degraded behavior, fix in normal flow
      low       — tech debt, nice-to-have improvement
      blocking  — current task cannot proceed without this being fixed first
      degraded  — task completed but with known defects, needs human review
      info      — observation worth tracking, no urgency

.EXAMPLE
    .\New-Issue.ps1 -Title "Upgrade SHA-256 to PBKDF2" `
        -File "apps/vibe-tutor/src/components/core/SecurePinLock.tsx" `
        -Severity high `
        -Description "SHA-256 is too fast for PIN hashing; use PBKDF2 with 310k iterations." `
        -SuggestedFix "Replace hashPin() with crypto.subtle.deriveBits(PBKDF2, ...)" `
        -FoundBy CELL_02
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Title,
    [string]$File         = '',
    [string]$Description  = '',
    [ValidateSet('critical','high','medium','low','blocking','degraded','info')]
    [string]$Severity     = 'medium',
    [string]$FoundBy      = 'manual',
    [string]$SuggestedFix = '',   # agent's own hypothesis — often 80% right
    [string]$ReproContext = ''    # minimal state to reproduce the issue
)

$IssuesDir = 'D:\databases\agent_issues'
if (-not (Test-Path $IssuesDir)) {
    New-Item -ItemType Directory -Path $IssuesDir -Force | Out-Null
}

$id   = Get-Date -Format 'yyyyMMdd-HHmmssfff'
$slug = ($Title -replace '[^a-zA-Z0-9 ]', '' -replace '\s+', '-').ToLower()
$slug = $slug.Substring(0, [Math]::Min(40, $slug.Length)).TrimEnd('-')
$path = Join-Path $IssuesDir "$id-$slug.json"

[ordered]@{
    id            = $id
    title         = $Title
    file          = $File
    description   = $Description
    severity      = $Severity
    status        = 'open'
    foundBy       = $FoundBy
    foundAt       = (Get-Date -Format 'o')
    assignedTo    = $null
    suggestedFix  = $SuggestedFix
    reproContext  = $ReproContext
    notes         = @()
} | ConvertTo-Json | Set-Content -Path $path -Encoding UTF8

$colour = switch ($Severity) {
    'critical' { 'Red' } 'blocking' { 'Red' } 'high' { 'Yellow' }
    'degraded' { 'Magenta' } 'medium' { 'Cyan' } default { 'White' }
}
Write-Host "[$Severity] Issue logged: $id" -ForegroundColor $colour
Write-Host "  $Title" -ForegroundColor White
if ($File)         { Write-Host "  $File"         -ForegroundColor DarkGray }
if ($SuggestedFix) { Write-Host "  Fix: $SuggestedFix" -ForegroundColor DarkGray }

# Return ID so callers can reference it
Write-Output $id
