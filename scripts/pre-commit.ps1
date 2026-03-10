# VibeTech Monorepo Pre-Commit Hook
# Runs quality checks on staged files before allowing commit

$ErrorActionPreference = "Stop"
$exitCode = 0

Write-Host "`n=== VibeTech Pre-Commit Quality Gates ===" -ForegroundColor Cyan
Write-Host ""

# Get staged files
$stagedFiles = git diff --cached --name-only --diff-filter=ACM

if (-not $stagedFiles) {
    Write-Host "No staged files to check." -ForegroundColor Yellow
    exit 0
}

# Filter TypeScript/JavaScript files
$tsFiles = $stagedFiles | Where-Object { $_ -match '\.(ts|tsx|js|jsx)$' }
$hasTypeScriptFiles = $tsFiles.Count -gt 0

# ============================================
# 1. ESLint Check (if TS/JS files staged)
# ============================================
if ($hasTypeScriptFiles) {
    Write-Host "[1/3] Running ESLint..." -ForegroundColor Yellow

    try {
        $eslintResult = pnpm eslint $tsFiles --max-warnings 0 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ESLint passed" -ForegroundColor Green
        } else {
            Write-Host "  ESLint failed:" -ForegroundColor Red
            Write-Host $eslintResult
            $exitCode = 1
        }
    } catch {
        Write-Host "  ESLint error: $_" -ForegroundColor Red
        $exitCode = 1
    }
} else {
    Write-Host "[1/3] ESLint skipped (no TS/JS files)" -ForegroundColor DarkGray
}

# ============================================
# 2. TypeScript Typecheck (affected projects)
# ============================================
Write-Host "[2/3] Running TypeScript typecheck..." -ForegroundColor Yellow

# Determine which apps have staged changes
$affectedApps = @()
foreach ($file in $stagedFiles) {
    if ($file -match '^apps/([^/]+)/') {
        $appName = $Matches[1]
        if ($affectedApps -notcontains $appName) {
            $affectedApps += $appName
        }
    }
}

if ($affectedApps.Count -gt 0) {
    foreach ($app in $affectedApps) {
        $appPath = "apps/$app"
        $tsconfigPath = "$appPath/tsconfig.json"

        # Check for project-specific tsconfig
        if (Test-Path $tsconfigPath) {
            Write-Host "  Checking $app..." -ForegroundColor DarkYellow

            try {
                $typecheckResult = pnpm tsc -p $tsconfigPath --noEmit 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    $app passed" -ForegroundColor Green
                } else {
                    Write-Host "    $app failed:" -ForegroundColor Red
                    Write-Host $typecheckResult
                    $exitCode = 1
                }
            } catch {
                Write-Host "    $app error: $_" -ForegroundColor Red
                $exitCode = 1
            }
        }
    }
} else {
    Write-Host "  No app changes detected, skipping" -ForegroundColor DarkGray
}

# ============================================
# 3. File Size Check (prevent large files)
# ============================================
Write-Host "[3/3] Checking file sizes..." -ForegroundColor Yellow

$maxSizeBytes = 5MB
$largeFiles = @()

foreach ($file in $stagedFiles) {
    if (Test-Path $file) {
        $fileSize = (Get-Item $file).Length
        if ($fileSize -gt $maxSizeBytes) {
            $largeFiles += "$file ($('{0:N2}' -f ($fileSize / 1MB)) MB)"
        }
    }
}

if ($largeFiles.Count -gt 0) {
    Write-Host "  Large files detected (>5MB):" -ForegroundColor Red
    foreach ($f in $largeFiles) {
        Write-Host "    - $f" -ForegroundColor Red
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