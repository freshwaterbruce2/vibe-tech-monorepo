param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'

$root = "V:\monorepo"
$tmpRoot = Join-Path $root "tmp"
$driftRoots = @(
    $root
)

$skipPathPatterns = @(
    '\\\.git\\',
    '\\node_modules\\',
    '\\.nx\\',
    '\\.pnpm-store\\',
    '\\.turbo\\',
    '\\target\\',
    '\\\.venv\\',
    '\\venv\\',
    '\\Ollama\\',
    '\\_backups\\',
    '\\_worktrees\\',
    '\\\.gradle\\',
    '\\build\\',
    '\\playwright-report\\',
    '\\test-results\\',
    '\\coverage\\',
    '\\\.gemini\\',
    '\\\.antigravitycli\\',
    '\\\.pnpm\\'
)

function ShouldSkipPath([string]$path) {
    foreach ($pattern in $skipPathPatterns) {
        if ($path -match $pattern) {
            return $true
        }
    }
    return $false
}

function Remove-PathSafely {
    param(
        [string]$Path,
        [string]$Reason
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $kind = if (Test-Path -LiteralPath $Path -PathType Container) { "directory" } else { "file" }
    Write-Host "[$Reason] $kind -> $Path"

    if ($DryRun) {
        return
    }

    if ($kind -eq "directory") {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
    }
    else {
        Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    }
}

function Remove-DirectoryContents([string]$DirectoryPath) {
    if (-not (Test-Path -LiteralPath $DirectoryPath)) {
        return
    }

    Get-ChildItem -LiteralPath $DirectoryPath -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-PathSafely -Path $_.FullName -Reason "tmp"
    }
}

function CollectDistCandidates {
    $candidates = New-Object System.Collections.Generic.List[string]
    $skipDirs = @('.git', '.vscode', 'node_modules', '.nx', '.pnpm-store', '.turbo', 'target', '.venv', 'venv', 'Ollama', '_backups', '_worktrees', '.gradle', 'build', 'playwright-report', 'test-results', 'coverage', '.gemini', '.antigravitycli', '.pnpm')
    $stack = New-Object System.Collections.Generic.Stack[string]

    foreach ($root in $driftRoots) {
        if (Test-Path -LiteralPath $root) {
            [void]$stack.Push([IO.Path]::GetFullPath($root))
        }
    }

    while ($stack.Count -gt 0) {
        $currentDir = $stack.Pop()
        if (ShouldSkipPath $currentDir) {
            continue
        }

        $entries = Get-ChildItem -LiteralPath $currentDir -Directory -Force -ErrorAction SilentlyContinue
        foreach ($entry in $entries) {
            if ($skipDirs -contains $entry.Name) {
                continue
            }

            if ($entry.Name -eq "dist" -or $entry.Name -eq "dist-electron") {
                $candidates.Add($entry.FullName)
                continue
            }

            [void]$stack.Push($entry.FullName)
        }
    }

    $unique = @{}
    foreach ($candidate in $candidates) {
        $full = [IO.Path]::GetFullPath($candidate)
        $unique[$full] = $true
    }

    return [string[]]($unique.Keys | Sort-Object { $_.Length } -Descending)
}

Write-Host "Cleaning stale V:\monorepo artifacts"

$tmpCount = 0
if (Test-Path -LiteralPath $tmpRoot) {
    Write-Host "`nCleaning tmp/..."
    $tmpEntries = Get-ChildItem -LiteralPath $tmpRoot -Force -ErrorAction SilentlyContinue
    $tmpCount = $tmpEntries.Count
    Remove-DirectoryContents -DirectoryPath $tmpRoot
}
else {
    Write-Host "`ntmp/ missing - nothing to clean"
}

$distCandidates = CollectDistCandidates

$cacheRoots = @(
    $env:TEMP,
    "C:\Windows\Temp",
    "V:\monorepo\.nx\cache",
    "V:\monorepo\node_modules\.cache",
    (Join-Path $env:LOCALAPPDATA 'Temp\claude')
)

Write-Host "\nCleaning system temp and cache folders..."
$cacheCount = 0
foreach ($cRoot in $cacheRoots) {
    if (Test-Path -LiteralPath $cRoot) {
        $cEntries = Get-ChildItem -LiteralPath $cRoot -Force -ErrorAction SilentlyContinue
        $cacheCount += $cEntries.Count
        Remove-DirectoryContents -DirectoryPath $cRoot
    }
}

Write-Host "`nCleaning dist artifacts..."
$distCount = $distCandidates.Count
foreach ($candidate in $distCandidates) {
    Remove-PathSafely -Path $candidate -Reason "dist"
}

if ($DryRun) {
    Write-Host "`nDry run complete. Would remove $tmpCount tmp entries, $cacheCount cache/temp entries, and $distCount dist paths."
}
else {
    Write-Host "`nCleanup complete. Removed $tmpCount tmp entries, $cacheCount cache/temp entries, and $distCount dist paths."
}

exit 0
