<#
.SYNOPSIS
    Wire up the universal agent-skills layout via directory junctions (Windows 11).

.DESCRIPTION
    Consolidates agent "skills" so Claude Code, Gemini CLI, and Codex all read ONE
    canonical aggregate folder:  ~/.claude/skills

    Two kinds of junctions are (re)created:

      1. PER-SKILL junctions for Bruce's git-tracked authored skills:
         For each <name> under V:\monorepo\skills, a junction is placed at
         ~/.claude/skills\<name> -> V:\monorepo\skills\<name>. Editing the repo
         copy then propagates to every tool. Heavy vendored skills already living
         in ~/.claude/skills as REAL directories are left untouched (never copied).

      2. WHOLE-DIR junctions for the other tools:
         ~/.gemini/skills and ~/.codex/skills -> ~/.claude/skills, but only when
         the parent tool dir (~/.gemini, ~/.codex) already exists.

    Junctions are per-machine state and are NOT tracked in git. Re-run this script
    on a new machine (or after the links are lost) to rebuild them. The script is
    idempotent and safe to run repeatedly.

.EXAMPLE
    pwsh scripts\Link-Skills.ps1 -WhatIf
    Preview every action without changing anything.

.EXAMPLE
    pwsh scripts\Link-Skills.ps1
    Create/refresh the junctions.
#>

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'

$Canonical = Join-Path $env:USERPROFILE '.claude\skills'
$Authored  = 'V:\monorepo\skills'

if (-not (Test-Path -LiteralPath $Canonical)) {
    Write-Error "Canonical aggregate not found: $Canonical. Create it (with the vendored skills) before running this script."
    return
}
if (-not (Test-Path -LiteralPath $Authored)) {
    Write-Error "Authored skills dir not found: $Authored."
    return
}

$created    = 0
$skipped    = 0
$collisions = 0
$backedUp   = 0

# Returns: 'missing' | 'junction-correct' | 'junction-wrong' | 'real'
function Get-LinkState {
    param([string]$Path, [string]$Target)
    if (-not (Test-Path -LiteralPath $Path)) { return 'missing' }
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.LinkType -eq 'Junction') {
        $current = ($item.Target | Select-Object -First 1)
        if ($current -and ($current.TrimEnd('\') -ieq $Target.TrimEnd('\'))) {
            return 'junction-correct'
        }
        return 'junction-wrong'
    }
    return 'real'
}

# ---- 1. Per-skill junctions for authored skills ----------------------------
Write-Host "== Authored skills -> $Canonical ==" -ForegroundColor Cyan
$skillDirs = Get-ChildItem -LiteralPath $Authored -Directory -ErrorAction SilentlyContinue
foreach ($skill in $skillDirs) {
    $name   = $skill.Name
    $link   = Join-Path $Canonical $name
    $target = $skill.FullName
    $state  = Get-LinkState -Path $link -Target $target

    switch ($state) {
        'junction-correct' {
            Write-Host "  ok        $name"
            $skipped++
        }
        'junction-wrong' {
            if ($PSCmdlet.ShouldProcess($link, "Re-point junction -> $target")) {
                Remove-Item -LiteralPath $link -Force -Recurse
                New-Item -ItemType Junction -Path $link -Target $target | Out-Null
                Write-Host "  repointed $name" -ForegroundColor Yellow
                $created++
            }
        }
        'real' {
            Write-Warning "  COLLISION $name : real directory at $link (not a junction). Resolve manually; skipping."
            $collisions++
        }
        'missing' {
            if ($PSCmdlet.ShouldProcess($link, "Create junction -> $target")) {
                New-Item -ItemType Junction -Path $link -Target $target | Out-Null
                Write-Host "  created   $name" -ForegroundColor Green
                $created++
            }
        }
    }
}

# ---- 2. Whole-dir junctions for other tools --------------------------------
Write-Host "== Tool skill dirs -> $Canonical ==" -ForegroundColor Cyan
$stamp     = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupRoot = "D:\backups\skills-link-backup_$stamp"

$tools = @(
    @{ Name = 'gemini'; Parent = (Join-Path $env:USERPROFILE '.gemini'); Link = (Join-Path $env:USERPROFILE '.gemini\skills') },
    @{ Name = 'codex';  Parent = (Join-Path $env:USERPROFILE '.codex');  Link = (Join-Path $env:USERPROFILE '.codex\skills') }
)

foreach ($tool in $tools) {
    if (-not (Test-Path -LiteralPath $tool.Parent)) {
        Write-Host "  skip      $($tool.Name) (not installed: $($tool.Parent))"
        $skipped++
        continue
    }

    $link  = $tool.Link
    $state = Get-LinkState -Path $link -Target $Canonical

    switch ($state) {
        'junction-correct' {
            Write-Host "  ok        $($tool.Name)\skills"
            $skipped++
        }
        'missing' {
            if ($PSCmdlet.ShouldProcess($link, "Create junction -> $Canonical")) {
                New-Item -ItemType Junction -Path $link -Target $Canonical | Out-Null
                Write-Host "  created   $($tool.Name)\skills" -ForegroundColor Green
                $created++
            }
        }
        default {
            # 'real' or 'junction-wrong': back up contents, remove, recreate.
            $backupDest = Join-Path $backupRoot $tool.Name
            if ($PSCmdlet.ShouldProcess($link, "Back up to $backupDest, remove, then junction -> $Canonical")) {
                New-Item -ItemType Directory -Path $backupDest -Force | Out-Null
                robocopy $link $backupDest /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
                Write-Host "  backed up $($tool.Name)\skills -> $backupDest" -ForegroundColor Yellow
                $backedUp++
                Remove-Item -LiteralPath $link -Force -Recurse
                New-Item -ItemType Junction -Path $link -Target $Canonical | Out-Null
                Write-Host "  created   $($tool.Name)\skills" -ForegroundColor Green
                $created++
            }
        }
    }
}

# ---- 3. Summary ------------------------------------------------------------
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  created:    $created"
Write-Host "  skipped:    $skipped"
Write-Host "  collisions: $collisions"
Write-Host "  backed up:  $backedUp"
if ($collisions -gt 0) {
    Write-Host "  Resolve collisions above by removing/renaming the real dir, then re-run." -ForegroundColor Yellow
}
