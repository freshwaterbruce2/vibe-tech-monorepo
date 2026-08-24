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

# Tee the full hook output to D:\logs\pre-commit so a failing step is diagnosable
# after the fact (per the D:\-drive logging policy) instead of scrolling past in the
# terminal. Logging must never break a commit — swallow any failure (e.g. D:\ absent).
$preCommitLog = $null
try {
    $logDir = 'D:\logs\pre-commit'
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $preCommitLog = Join-Path $logDir ("precommit-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    Start-Transcript -Path $preCommitLog -Force -ErrorAction Stop | Out-Null
} catch {
    $preCommitLog = $null
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
            # Group staged files by their nearest eslint-suppressions.json.
            # Bulk-suppression baselines (ESLint >= 9.24) are keyed relative to
            # the project dir (the dir holding the file), matching how each project
            # lints itself, so each group is linted FROM that project dir. Files
            # without a baseline lint from the repo root. New violations still
            # fail; only baselined legacy counts pass. See
            # .claude/rules/code-size-limits.md.
            $groups = @{}
            foreach ($file in $sourceFiles) {
                $dir = Split-Path $file -Parent
                $suppressions = ''
                while ($dir) {
                    $candidate = Join-Path $dir 'eslint-suppressions.json'
                    if (Test-Path $candidate) { $suppressions = $candidate; break }
                    $parent = Split-Path $dir -Parent
                    if (-not $parent -or $parent -eq $dir) { break }
                    $dir = $parent
                }
                if (-not $groups.ContainsKey($suppressions)) {
                    $groups[$suppressions] = [System.Collections.ArrayList]::new()
                }
                [void]$groups[$suppressions].Add($file)
            }

            $repoRoot = (Get-Location).Path
            $batchSize = 5
            $eslintFail = $false
            foreach ($suppressions in @($groups.Keys)) {
                $groupFiles = @($groups[$suppressions])
                # For a baselined group, lint from the project dir (the dir holding
                # eslint-suppressions.json) so the file's project-relative keys match.
                $projRoot = if ($suppressions) {
                    Split-Path (Join-Path $repoRoot $suppressions) -Parent
                } else { $repoRoot }
                for ($i = 0; $i -lt $groupFiles.Count; $i += $batchSize) {
                    $end = [Math]::Min($i + $batchSize - 1, $groupFiles.Count - 1)
                    $batch = $groupFiles[$i..$end]
                    if ($batch -and $batch.Count -gt 0) {
                        if ($suppressions) {
                            # Re-express staged paths relative to the project dir,
                            # then lint from there so auto-loaded baseline keys match.
                            # Forward slashes + `--` avoid Windows ESLint glob failures
                            # ("No files matching the pattern `"v`"" when `\` escapes).
                            $rel = @(
                                $batch | ForEach-Object {
                                    $p = [System.IO.Path]::GetRelativePath(
                                        $projRoot,
                                        (Join-Path $repoRoot $_)
                                    )
                                    if (-not $p -or $p -eq '.') { return }
                                    ($p -replace '\\', '/')
                                } | Where-Object { $_ }
                            )
                            if ($rel.Count -eq 0) { continue }
                            Push-Location $projRoot
                            # Subset lint always leaves other files' baseline
                            # entries unused — don't fail on unpruned ones.
                            pnpm exec eslint --max-warnings=0 --no-warn-ignored `
                                --suppressions-location eslint-suppressions.json `
                                --pass-on-unpruned-suppressions -- @rel
                            $code = $LASTEXITCODE
                            Pop-Location
                        } else {
                            $normBatch = @(
                                $batch | ForEach-Object {
                                    if (-not $_ -or $_ -eq '.') { return }
                                    ($_ -replace '\\', '/')
                                } | Where-Object { $_ }
                            )
                            if ($normBatch.Count -eq 0) { continue }
                            pnpm exec eslint --max-warnings=0 --no-warn-ignored -- @normBatch
                            $code = $LASTEXITCODE
                        }
                        if ($code -ne 0) {
                            $eslintFail = $true
                            break
                        }
                    }
                }
                if ($eslintFail) { break }
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
    #
    # Windows CreateProcess has a ~32k arg limit. Large staged sets (full-app
    # ports) blow up `nx affected --files=a,b,c,...` with "The command line is
    # too long." Fall back to project-scoped typecheck for those cases.
    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "[3/4] Running Nx typecheck..." -Command {
            $useFileList = $typeScriptFiles.Count -le 40 -and $nxTypecheckFileList.Length -le 6000
            if ($useFileList) {
                pnpm exec nx affected -t typecheck --files="$nxTypecheckFileList" --outputStyle=static
            } else {
                $appProjects = @(
                    $typeScriptFiles | ForEach-Object {
                        $n = $_ -replace '\\', '/'
                        if ($n -match '^apps/([^/]+)/') { $Matches[1] }
                    } | Select-Object -Unique
                )
                if ($appProjects.Count -eq 0) {
                    Write-Host "No apps/* projects in staged TS; falling back to file-list typecheck (may fail on Windows if huge)." -ForegroundColor Yellow
                    pnpm exec nx affected -t typecheck --files="$nxTypecheckFileList" --outputStyle=static
                } else {
                    $plist = ($appProjects -join ',')
                    Write-Host "Large staged set ($($typeScriptFiles.Count) files) — typechecking projects: $plist" -ForegroundColor DarkGray
                    pnpm exec nx run-many -t typecheck -p $plist --outputStyle=static
                }
            }
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
        # 1) Generate coverage by running ONLY the tests related to the staged
        #    source (Vitest `related`), grouped per owning project. This runs just
        #    the tests that import the changed files instead of the whole suite, so
        #    a commit costs ~1-2 min with identical 100%-on-changed-code semantics
        #    (a changed line is covered iff a test importing that file hits it —
        #    exactly what `related` runs). Whole-project coverage/lint/all-tests are
        #    the separate `pnpm run quality:full <project>` pre-push sweep, which is
        #    where pre-existing/legacy problems are surfaced.
        $vitestBin = (Resolve-Path (Join-Path $PSScriptRoot '..\node_modules\vitest\vitest.mjs')).Path

        # Group changed source files by their owning project (nearest package.json).
        $covByProject = [ordered]@{}
        foreach ($f in $coverableFiles) {
            $dir = Split-Path $f -Parent
            $projRoot = $null
            while ($dir -and $dir -ne '.') {
                if (Test-Path (Join-Path $dir 'package.json')) {
                    $projRoot = ($dir -replace '\\', '/'); break
                }
                $dir = Split-Path $dir -Parent
            }
            if (-not $projRoot) { continue }
            if (-not $covByProject.Contains($projRoot)) { $covByProject[$projRoot] = @() }
            $covByProject[$projRoot] += $f.Substring($projRoot.Length + 1)
        }

        foreach ($proj in $covByProject.Keys) {
            # Skip projects with no test:coverage script; step 2 then flags their
            # changed files as "no coverage report" (same as the old nx-skip path).
            $pkg = Get-Content (Join-Path $proj 'package.json') -Raw | ConvertFrom-Json
            if (-not ($pkg.scripts -and $pkg.scripts.'test:coverage')) { continue }

            $relFiles = $covByProject[$proj]
            $exitCode = [Math]::Max(
                [int]$exitCode,
                [int](Invoke-QualityCommand -Label "[cov 1/2] Coverage for tests related to changed files in $proj..." -Command {
                    Push-Location $proj
                    try {
                        node "$vitestBin" related @relFiles --run --coverage --passWithNoTests
                    } finally {
                        Pop-Location
                    }
                })
            )
        }

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

    # Cyclomatic-complexity cap (CCN <= 15) for the Lizard languages (.py/.rs/etc.).
    # JS/TS complexity is enforced by the ESLint step above (step 2/4); this covers
    # what ESLint can't. Grandfathered via complexity-baseline.json; skips (does not
    # block) if Lizard is absent. The validator filters the staged list internally.
    $exitCode = [Math]::Max(
        [int]$exitCode,
        [int](Invoke-QualityCommand -Label "  Checking complexity caps on staged files..." -Command {
            node scripts/validate-complexity.js @lineCountFiles
        })
    )
} else {
    Write-Host "  Line-count check skipped (no code files)" -ForegroundColor DarkGray
}

# ============================================
# 5. Full Workspace Integration Harness — MOVED OUT OF THE PER-COMMIT HOOK
# ============================================
# verify-agent-changes.ps1 is a full-workspace "master validation harness": it
# runs a ~55s path-policy scan, a recursive task_plan.json search over the entire
# tree (incl. node_modules), full `pnpm run typecheck` (~80 projects), and
# `pnpm run test:unit:all` (the whole monorepo vitest suite). In a per-commit hook
# that hung for many minutes, spawned 45+ orphaned vitest workers, and corrupted
# the working tree when killed mid-run (interrupted lint-staged stash).
#
# Changed code is already gated above by fast, scoped checks: lint-staged's
# staged-path AST validation, ESLint on staged files, `nx affected typecheck`
# (step 3/4), and the 100% diff-coverage gate (step cov). The full harness belongs
# in CI or a manual run: `pwsh scripts/verify-agent-changes.ps1`.

# ============================================
# 6. Database Growth Trend Check
# ============================================
$exitCode = [Math]::Max(
    [int]$exitCode,
    [int](Invoke-QualityCommand -Label "[5/5] Checking database growth limits (<15% growth delta)..." -Command {
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

if ($preCommitLog) {
    try { Stop-Transcript -ErrorAction Stop | Out-Null } catch { }
    Write-Host "Full pre-commit log: $preCommitLog" -ForegroundColor DarkGray
}

exit $exitCode
