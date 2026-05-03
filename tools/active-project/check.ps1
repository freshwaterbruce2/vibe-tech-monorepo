[CmdletBinding()] param()

. "$PSScriptRoot\_lib.ps1"

$lock = Get-Lock
if (-not (Test-LockActive $lock)) {
    Write-Host 'No active project lock — nothing to check.'
    exit 0
}

$project = $lock.activeProject
$projectSrcDir = Join-Path $Script:RepoRoot "apps\$project\src"

Write-Host ''
Write-Host "Running auto criteria for: $project"
Write-Host ''

function Invoke-NxTarget {
    param([string] $Target)
    Push-Location $Script:RepoRoot
    try {
        $proc = Start-Process -FilePath 'pnpm' -ArgumentList @('nx', $Target, $project) `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput "$env:TEMP\nx-$Target.out" `
            -RedirectStandardError  "$env:TEMP\nx-$Target.err"
        return $proc.ExitCode -eq 0
    } catch {
        Write-Host "    error invoking pnpm nx ${Target}: $_"
        return $false
    } finally {
        Pop-Location
    }
}

function Test-NoTodos {
    if (-not (Test-Path $projectSrcDir)) { return $false }
    $hits = Get-ChildItem -Path $projectSrcDir -Recurse -File `
        -Include *.ts, *.tsx, *.js, *.jsx -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\(__tests__|test|tests)\\' -and $_.Name -notmatch '\.test\.|\.spec\.' } |
        Select-String -Pattern '\b(TODO|FIXME)\b' -SimpleMatch:$false -ErrorAction SilentlyContinue
    return ($null -eq $hits -or $hits.Count -eq 0)
}

function Test-NoMocks {
    if (-not (Test-Path $projectSrcDir)) { return $false }
    # Look for explicit "Not implemented" / "PLACEHOLDER" markers in non-test src files.
    $patterns = @(
        "throw new Error\s*\(\s*['""]Not implemented",
        '//\s*PLACEHOLDER',
        '//\s*placeholder'
    )
    foreach ($p in $patterns) {
        $hits = Get-ChildItem -Path $projectSrcDir -Recurse -File `
            -Include *.ts, *.tsx, *.js, *.jsx -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\(__tests__|test|tests)\\' -and $_.Name -notmatch '\.test\.|\.spec\.' } |
            Select-String -Pattern $p -ErrorAction SilentlyContinue
        if ($hits -and $hits.Count -gt 0) { return $false }
    }
    return $true
}

$results = @{}

foreach ($c in $lock.criteria) {
    if ($c.type -ne 'auto') { continue }

    Write-Host ("  - {0,-12} " -f $c.id) -NoNewline
    $passed = $false
    switch ($c.id) {
        'build'     { $passed = Invoke-NxTarget 'build' }
        'typecheck' { $passed = Invoke-NxTarget 'typecheck' }
        'lint'      { $passed = Invoke-NxTarget 'lint' }
        'test'      { $passed = Invoke-NxTarget 'test' }
        'no-todos'  { $passed = Test-NoTodos }
        'no-mocks'  { $passed = Test-NoMocks }
        default     {
            Write-Host 'SKIP (unknown auto criterion id)'
            continue
        }
    }
    $results[$c.id] = $passed
    if ($passed) { Write-Host 'PASS' } else { Write-Host 'FAIL' }
}

# Update satisfied flags in-place
foreach ($c in $lock.criteria) {
    if ($c.type -eq 'auto' -and $results.ContainsKey($c.id)) {
        $c.satisfied = $results[$c.id]
    }
}

Save-Lock -Lock $lock

Write-Host ''
$counts = Get-CountSatisfied $lock
Write-Host "Result: $($counts.Met)/$($counts.Total) criteria satisfied (manual criteria require user confirmation)"
Write-Host ''
