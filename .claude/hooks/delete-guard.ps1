#!/usr/bin/env powershell
# PreToolUse delete-guard
# Recurrence guard for the 2026-06-17 incident (an unattended agent hard-deleted
# the V:\monorepo source tree). Blocks catastrophic recursive/forced deletion of
# the workspace ROOT or its top-level SOURCE dirs, in ANY permission mode (hooks
# fire even under --dangerously-skip-permissions). Build artifacts stay deletable.
#
# Exit 0 = allow, Exit 2 = block (stderr is shown to the agent).

$ErrorActionPreference = 'SilentlyContinue'

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $d = $raw | ConvertFrom-Json -ErrorAction Stop

    # Pull the command string from whichever field the tool uses.
    $cmd = ''
    foreach ($f in @($d.tool_input.command, $d.tool_input.script, $d.tool_input.code, $d.tool_input.shellInput)) {
        if (-not [string]::IsNullOrWhiteSpace($f)) { $cmd = [string]$f; break }
    }
    if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }

    $cwd = ''
    if ($d.cwd) { $cwd = [string]$d.cwd }
    $low = $cmd.ToLower()

    # 1) Is this a recursive/forced destructive delete or a tree-clean?
    $destructive = $false
    if ($low -match '\brm\b[^|;&]*\s-[a-z]*r')                                  { $destructive = $true } # rm -r/-rf/-fr
    if ($low -match '(remove-item|\bri\b|\brmdir\b|\brd\b)[^|;&]*(-recurse|\s/s\b|\s-r\b)') { $destructive = $true }
    if ($low -match '\b(del|erase)\b[^|;&]*\s/s\b')                             { $destructive = $true } # cmd del /s
    if ($low -match '\bgit\b[^|;&]*\bclean\b[^|;&]*-[a-z]*[dx]')                { $destructive = $true } # git clean -fd/-fdx
    if ($low -match '\brimraf\b')                                               { $destructive = $true }
    if (-not $destructive) { exit 0 }

    $root      = '(v:[\\/]monorepo|/v/monorepo)'
    $sourceSeg = '(apps|packages|backend|tools|scripts|types|memory|docs|\.claude|\.github)'
    $artifact  = '(node_modules|[\\/]dist|\.nx|\.cache|[\\/]build\b|coverage|\.turbo|[\\/]out\b|\.vite|dist-electron|[\\/]te?mp)'
    $cwdInRepo = ($cwd.ToLower() -match $root)

    # 2) What does it target?
    $targetsRoot      = ($low -match ($root + '\s*["'']?\s*(-|;|\||$)')) -or ($low -match ($root + '[\\/]?\s*\*'))
    $targetsAbsSource = ($low -match ($root + '[\\/]' + $sourceSeg + '([\\/"'' ]|$)'))
    $targetsRelSource = $cwdInRepo -and ($low -match ('\b(rm|remove-item|\bri\b|rd|rmdir|del|erase)\b[^|;&]*\s["'']?\.?[\\/]?' + $sourceSeg + '([\\/"'' ]|$)'))
    $targetsDotStar   = $cwdInRepo -and ($low -match '\b(rm|remove-item|del|rd|rmdir)\b[^|;&]*\s["'']?(\.|\*|\.[\\/]|\.[\\/]\*)(\s|$|["''])')
    $gitCleanInRepo   = $cwdInRepo -and ($low -match '\bgit\b[^|;&]*\bclean\b')

    $targetsMonorepo = $targetsRoot -or $targetsAbsSource -or $targetsRelSource -or $targetsDotStar -or $gitCleanInRepo
    if (-not $targetsMonorepo) { exit 0 }

    # 3) Artifact-only exception: allow cleaning build outputs inside source dirs
    #    (but never when the bare workspace root is the target).
    if (-not $targetsRoot -and -not $gitCleanInRepo -and ($targetsAbsSource -or $targetsRelSource) -and ($low -match $artifact)) {
        exit 0
    }

    # BLOCK
    [Console]::Error.WriteLine("BLOCKED by delete-guard: refusing recursive deletion of the V:\monorepo source tree.")
    [Console]::Error.WriteLine("This is the recurrence guard for the 2026-06-17 source-wipe incident.")
    [Console]::Error.WriteLine("Artifact dirs are still deletable (node_modules, dist, .nx, build, coverage).")
    [Console]::Error.WriteLine("If this deletion is genuinely intended, run it yourself outside the agent, or target a specific subdirectory.")
    exit 2
}
catch {
    exit 0  # never block on a parser/runtime error
}
