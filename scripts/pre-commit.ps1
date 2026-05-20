# VibeTech Monorepo Pre-Commit Hook
# Runs scoped Nx quality checks on staged files before allowing commits.

$ErrorActionPreference = "Stop"
$exitCode = 0

Write-Host "`n=== VibeTech Pre-Commit Quality Gates ===" -ForegroundColor Cyan
Write-Host ""

$stagedFiles = @(git diff --cached --name-only --diff-filter=ACMR)

if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
    Write-Host "No staged files to check." -ForegroundColor Yellow
    exit 0
}

$sourceFiles = @(
    $stagedFiles | Where-Object {
        $_ -match '\.(ts|tsx|js|jsx|mjs|cjs)$' -and $_ -notmatch '\.d\.ts$'
    }
)
$typeScriptFiles = @(
    $stagedFiles | Where-Object { $_ -match '\.(ts|tsx)$' -and $_ -notmatch '\.d\.ts$' }
)
$nxTypecheckFileList = ($typeScriptFiles -join ',')

function Get-LintRoot {
    param([string]$File)

    $normalized = $File -replace '\\', '/'
    $parts = @($normalized -split '/')

    if ($parts.Count -lt 2) {
        return '.'
    }

    switch ($parts[0]) {
        'apps' {
            return "apps/$($parts[1])"
        }
        'packages' {
            if (
                $parts.Count -ge 3 -and
                $parts[1] -eq 'feature-flags' -and
                (Test-Path -LiteralPath "packages/feature-flags/$($parts[2])/package.json")
            ) {
                return "packages/feature-flags/$($parts[2])"
            }

            return "packages/$($parts[1])"
        }
        'backend' {
            if (
                $parts.Count -ge 2 -and
                (Test-Path -LiteralPath "backend/$($parts[1])/package.json")
            ) {
                return "backend/$($parts[1])"
            }

            return 'backend'
        }
        default {
            return '.'
        }
    }
}

function Get-RelativeLintPath {
    param(
        [string]$File,
        [string]$Root
    )

    $normalizedFile = $File -replace '\\', '/'
    $normalizedRoot = $Root -replace '\\', '/'

    if ($normalizedRoot -eq '.') {
        return $normalizedFile
    }

    $prefix = "$normalizedRoot/"
    if ($normalizedFile.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        return $normalizedFile.Substring($prefix.Length)
    }

    return $normalizedFile
}

function Invoke-QualityCommand {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host $Label -ForegroundColor Yellow
    try {
        # Route the inner command's stdout/stderr to the host so they don't
        # leak into the function's success stream and pollute the return value.
        & $Command 2>&1 | Out-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Passed" -ForegroundColor Green
            return 0
        }

        Write-Host "  Failed with exit code $LASTEXITCODE" -ForegroundColor Red
        return 1
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        return 1
    }
}

# ============================================
# 1. ESLint Check (if TS/JS files staged)
# ============================================
if ($sourceFiles.Count -gt 0) {
    # Use direct ESLint on staged files instead of nx affected to avoid
    # Nx graph computation hangs in pre-commit context. Run it from each
    # project root so typed ESLint rules can find project-local tsconfig files.
    $nodeOptions = if ($env:NODE_OPTIONS) { $env:NODE_OPTIONS } else { "" }
    if ($nodeOptions -notmatch '--max-old-space-size=') {
        $env:NODE_OPTIONS = (@($nodeOptions, '--max-old-space-size=8192') |
            Where-Object { $_ }) -join ' '
    }

    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "[1/3] Running ESLint on staged files..." -Command {
            $lintGroups = @{}
            foreach ($file in $sourceFiles) {
                $root = Get-LintRoot -File $file
                if (-not $lintGroups.ContainsKey($root)) {
                    $lintGroups[$root] = @()
                }
                $lintGroups[$root] += $file
            }

            foreach ($root in $lintGroups.Keys) {
                $relativeFiles = @(
                    $lintGroups[$root] | ForEach-Object {
                        Get-RelativeLintPath -File $_ -Root $root
                    }
                )

                Push-Location -LiteralPath $root
                try {
                    pnpm exec eslint --max-warnings=0 --no-warn-ignored @relativeFiles
                    if ($LASTEXITCODE -ne 0) {
                        throw "ESLint failed in $root with exit code $LASTEXITCODE"
                    }
                } finally {
                    Pop-Location
                }
            }
        })
    )
} else {
    Write-Host "[1/3] Lint skipped (no JS/TS files)" -ForegroundColor DarkGray
}

# ============================================
# 2. TypeScript Typecheck (projects affected by staged files)
# ============================================
if ($typeScriptFiles.Count -gt 0) {
    # Keep the hook scoped to the index. --uncommitted also includes unrelated
    # unstaged work, which makes normal commits fail on other active lanes.
    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "[2/3] Running Nx affected typecheck..." -Command {
            pnpm exec nx affected -t typecheck --files="$nxTypecheckFileList" --outputStyle=static
        })
    )
} else {
    Write-Host "[2/3] Typecheck skipped (no TS/TSX files)" -ForegroundColor DarkGray
}

# ============================================
# 3. File Size Check (prevent large files)
# ============================================
Write-Host "[3/3] Checking file sizes..." -ForegroundColor Yellow

$maxSizeBytes = 5MB
$largeFiles = @()

foreach ($file in $stagedFiles) {
    if (Test-Path -LiteralPath $file) {
        $fileSize = (Get-Item -LiteralPath $file).Length
        if ($fileSize -gt $maxSizeBytes) {
            $largeFiles += "$file ($('{0:N2}' -f ($fileSize / 1MB)) MB)"
        }
    }
}

if ($largeFiles.Count -gt 0) {
    Write-Host "  Large files detected (>5MB):" -ForegroundColor Red
    foreach ($file in $largeFiles) {
        Write-Host "    - $file" -ForegroundColor Red
    }
    $exitCode = 1
} else {
    Write-Host "  File sizes OK" -ForegroundColor Green
}

# ============================================
# Final Result
# ============================================
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "=== All checks passed ===" -ForegroundColor Green
} else {
    Write-Host "=== Pre-commit checks FAILED ===" -ForegroundColor Red
    Write-Host "Fix the issues above before committing." -ForegroundColor Yellow
    Write-Host "To bypass (emergency only): git commit --no-verify" -ForegroundColor DarkGray
}

exit $exitCode
