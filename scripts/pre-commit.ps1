# VibeTech Monorepo Pre-Commit Hook
# Runs scoped Nx quality checks on staged files before allowing commits.

$ErrorActionPreference = "Stop"
$exitCode = 0

$env:NX_DAEMON = "false"
$env:NX_NO_CLOUD = "true"

Write-Host "`n=== VibeTech Pre-Commit Quality Gates ===" -ForegroundColor Cyan
Write-Host ""

$stagedFiles = @(git diff --cached --name-only --diff-filter=ACM)

if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
    Write-Host "No staged files to check." -ForegroundColor Yellow
    exit 0
}

$sourceFiles = @(
    $stagedFiles | Where-Object {
        $_ -match '\.(ts|tsx|js|jsx|mjs|cjs)$' -and
        $_ -notmatch '\.d\.ts$' -and
        $_ -notmatch '^plugins/factory/src/generators/.+/files/'
    }
)
$typeScriptFiles = @(
    $stagedFiles | Where-Object {
        $_ -match '\.(ts|tsx)$' -and
        $_ -notmatch '\.d\.ts$' -and
        $_ -notmatch '^plugins/factory/src/generators/.+/files/'
    }
)
$nxTypecheckFileList = ($typeScriptFiles -join ',')

function Invoke-QualityCommand {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host $Label -ForegroundColor Yellow
    $oldPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
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
    } finally {
        $ErrorActionPreference = $oldPreference
    }
}

# ============================================
# 0. Lint-Staged Check (triggers AST and regex path segregation validation)
# ============================================
$exitCode = [Math]::Max(
    [int]$exitCode,
    [int](Invoke-QualityCommand -Label "[1/4] Running Lint-Staged gates (regex & AST path checks)..." -Command {
        pnpm exec lint-staged
    })
)

# ============================================
# 1. ESLint Check (if TS/JS files staged)
# ============================================
if ($sourceFiles.Count -gt 0) {
    # Use direct ESLint on staged files instead of nx affected to avoid
    # Nx graph computation hangs in pre-commit context.
    $nodeOptions = if ($env:NODE_OPTIONS) { $env:NODE_OPTIONS } else { "" }
    if ($nodeOptions -notmatch '--max-old-space-size=') {
        $env:NODE_OPTIONS = (@($nodeOptions, '--max-old-space-size=8192') |
            Where-Object { $_ }) -join ' '
    }

    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "[2/4] Running ESLint on staged files in batches..." -Command {
            $batchSize = 5
            $eslintFail = $false
            for ($i = 0; $i -lt $sourceFiles.Count; $i += $batchSize) {
                $end = [Math]::Min($i + $batchSize - 1, $sourceFiles.Count - 1)
                $batch = $sourceFiles[$i..$end]
                if ($batch -and $batch.Count -gt 0) {
                    pnpm exec eslint --max-warnings=0 --no-warn-ignored @batch
                    if ($LASTEXITCODE -ne 0) {
                        $eslintFail = $true
                        break
                    }
                }
            }
            if ($eslintFail) {
                cmd.exe /c "exit 1"
            }
        })
    )
} else {
    Write-Host "[2/4] Lint skipped (no JS/TS files)" -ForegroundColor DarkGray
}

# ============================================
# 2. TypeScript Typecheck (projects affected by staged files)
# ============================================
if ($typeScriptFiles.Count -gt 0) {
    # Keep the hook scoped to the index. --uncommitted also includes unrelated
    # unstaged work, which makes normal commits fail on other active lanes.
    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "[3/4] Running Nx affected typecheck..." -Command {
            pnpm exec nx affected -t typecheck --files="$nxTypecheckFileList" --outputStyle=static
        })
    )
} else {
    Write-Host "[3/4] Typecheck skipped (no TS/TSX files)" -ForegroundColor DarkGray
}

# ============================================
# 3b. Diff Coverage Gate (100% coverage on new/changed source)
# Enforces .claude/rules/testing-strategy.md: added/modified executable lines in
# app/package/backend src must be covered by a test. Legacy code is untouched.
# ============================================
if ($env:COVERAGE_GATE -eq 'off') {
    Write-Host "[cov] Diff coverage gate skipped (COVERAGE_GATE=off)" -ForegroundColor DarkGray
} else {
    $coverableFiles = @(
        $sourceFiles | Where-Object {
            ($_ -match '^(apps|packages)/[^/]+/(.*/)?src/' -or $_ -match '^backend/(.*/)?src/') -and
            $_ -notmatch '\.(test|spec)\.[cm]?[jt]sx?$' -and
            $_ -notmatch '\.d\.ts$' -and
            $_ -notmatch '\.config\.[cm]?[jt]s$' -and
            $_ -notmatch '(^|/)(__tests__|tests|e2e|__mocks__|__fixtures__|test|generated|migrations)/' -and
            $_ -notmatch '(^|/)types\.ts$' -and
            $_ -notmatch '\.types\.ts$'
        }
    )

    if ($coverableFiles.Count -eq 0) {
        Write-Host "[cov] Diff coverage skipped (no in-scope source staged)" -ForegroundColor DarkGray
    } else {
        $covFileList = ($coverableFiles -join ',')

        # 1) Generate coverage for projects affected by the staged source.
        #    Projects without a test:coverage target are skipped by Nx; their
        #    changed files then surface as "no coverage report" in step 2.
        $exitCode = [Math]::Max(
            [int]$exitCode,
            [int](Invoke-QualityCommand -Label "[cov 1/2] Running coverage for affected projects..." -Command {
                pnpm exec nx affected -t test:coverage --files="$covFileList" --outputStyle=static
            })
        )

        # 2) Enforce 100% coverage on the added lines of the staged source.
        $exitCode = [Math]::Max(
            [int]$exitCode,
            [int](Invoke-QualityCommand -Label "[cov 2/2] Enforcing 100% diff coverage on changed code..." -Command {
                node scripts/check-diff-coverage.js @coverableFiles
            })
        )
    }
}

# ============================================
# 3. File Size Check (byte size + line-count caps)
# ============================================
Write-Host "[4/4] Checking file sizes and line counts..." -ForegroundColor Yellow

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
    Write-Host "  Byte sizes OK (<5MB)" -ForegroundColor Green
}

# Line-count cap (500 warn / 1000 hard) via the shared validator. The script
# applies its own extension filter and exclusion globs (tests, generated code,
# migrations, scaffolding templates).
$lineCountFiles = @(
    $stagedFiles | Where-Object {
        $_ -match '\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|cs|cpp|c|rb|php|kt|swift)$' -and
        $_ -notmatch '\.d\.ts$'
    }
)

if ($lineCountFiles.Count -gt 0) {
    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "  Checking line-count caps on staged files..." -Command {
            node scripts/validate-file-size.js @lineCountFiles
        })
    )
} else {
    Write-Host "  Line-count check skipped (no code files)" -ForegroundColor DarkGray
}

# ============================================
# 5. Full Workspace Integration Harness Check
# ============================================
$exitCode = [Math]::Max(
    [int]$exitCode,
    [int](Invoke-QualityCommand -Label "[5/6] Running verify-agent-changes.ps1 harness (workspace-integrity checks only)..." -Command {
        # Scope the harness to fast workspace-integrity checks (path policy, DB
        # health, Ralph state, Kimi schema). The heavy full-workspace
        # `pnpm run typecheck` and `pnpm run test:unit:all` it would otherwise run
        # are redundant here and caused multi-minute hangs (45+ vitest workers) on
        # every commit: changed code is already gated by the scoped ESLint + `nx
        # affected typecheck` (step 3/4) and the 100% diff-coverage gate (step cov).
        # Full-workspace typecheck/tests belong in CI, not the per-commit hook.
        pwsh.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "verify-agent-changes.ps1") -SkipLint -SkipTypecheck -SkipTests
    })
)

# ============================================
# 6. Database Growth Trend Check
# ============================================
$exitCode = [Math]::Max(
    [int]$exitCode,
    [int](Invoke-QualityCommand -Label "[6/6] Checking database growth limits (<15% growth delta)..." -Command {
        pwsh.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-database-trends.ps1")
    })
)

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
