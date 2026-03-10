# Classify-Errors.ps1
# Analyzes TypeScript/ESLint errors and classifies them by priority
# Part of The Finisher v2.0 methodology

<#
.SYNOPSIS
Classifies project errors by priority (Critical, High, Medium) for strategic fixing.

.DESCRIPTION
Runs lint and typecheck, analyzes errors, and groups them by priority:
- Priority 1 (CRITICAL): Blocks build, runtime failures
- Priority 2 (HIGH): Code quality, maintainability
- Priority 3 (MEDIUM): Style, warnings

.PARAMETER ProjectPath
Path to the project to analyze (default: current directory)

.PARAMETER Format
Output format: table, json, markdown (default: markdown)

.EXAMPLE
.\Classify-Errors.ps1 -ProjectPath "C:\dev\apps\nova-agent"

.EXAMPLE
.\Classify-Errors.ps1 -Format json > errors.json
#>

param(
    [string]$ProjectPath = (Get-Location).Path,
    [ValidateSet('table', 'json', 'markdown')]
    [string]$Format = 'markdown'
)

# Error classification patterns
$criticalPatterns = @(
    # TypeScript compilation errors
    "error TS\d+:",
    "Cannot find module",
    "Cannot find name",
    "Module.*has no exported member",
    "Type.*is not assignable to type",
    "Property.*does not exist on type",

    # Build blockers
    "Module build failed",
    "Unexpected token",
    "SyntaxError",
    "Parse error",

    # Dependency issues
    "Cannot resolve dependency",
    "ENOENT: no such file",
    "ERR_MODULE_NOT_FOUND"
)

$highPatterns = @(
    # React anti-patterns
    "React\.FC",
    "React\.ReactNode",
    "React\.MouseEvent",
    "React\.ChangeEvent",
    "React\.FormEvent",
    "React\.KeyboardEvent",

    # Type safety
    "Unsafe assignment",
    "Unsafe member access",
    "Unsafe call",
    "Unsafe return",
    "@typescript-eslint/no-explicit-any",
    "@typescript-eslint/no-unsafe-",

    # Unused code
    "is declared but.*never used",
    "is defined but never used",
    "@typescript-eslint/no-unused-vars",

    # Dead code
    "Unreachable code detected",
    "@typescript-eslint/no-unreachable"
)

$mediumPatterns = @(
    # Style warnings
    "react-hooks/exhaustive-deps",
    "no-console",
    "no-debugger",

    # Formatting
    "prettier/prettier",
    "indent",
    "quotes",
    "semi",

    # Comments
    "no-warning-comments",
    "spaced-comment"
)

# Data structure to hold classified errors
$errorClassification = @{
    Critical = @()
    High = @()
    Medium = @()
    Unknown = @()
}

function Test-ErrorPattern {
    param(
        [string]$ErrorLine,
        [string[]]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ($ErrorLine -match $pattern) {
            return $true
        }
    }
    return $false
}

function Classify-Error {
    param([string]$ErrorLine)

    if (Test-ErrorPattern -ErrorLine $ErrorLine -Patterns $criticalPatterns) {
        return "Critical"
    }
    elseif (Test-ErrorPattern -ErrorLine $ErrorLine -Patterns $highPatterns) {
        return "High"
    }
    elseif (Test-ErrorPattern -ErrorLine $ErrorLine -Patterns $mediumPatterns) {
        return "Medium"
    }
    else {
        return "Unknown"
    }
}

function Get-ProjectErrors {
    param([string]$Path)

    Write-Host "🔍 Analyzing errors in: $Path" -ForegroundColor Cyan
    Write-Host ""

    # Check if it's an Nx project
    $isNxProject = Test-Path (Join-Path $Path "../../nx.json")
    $projectName = Split-Path $Path -Leaf

    # Run typecheck
    Write-Host "Running TypeScript check..." -ForegroundColor Yellow
    $typescriptErrors = @()

    if ($isNxProject) {
        $tscOutput = & pnpm nx typecheck $projectName 2>&1 | Out-String
    } else {
        $tscOutput = & pnpm run typecheck 2>&1 | Out-String
    }

    # Run lint
    Write-Host "Running ESLint check..." -ForegroundColor Yellow
    $lintErrors = @()

    if ($isNxProject) {
        $lintOutput = & pnpm nx lint $projectName 2>&1 | Out-String
    } else {
        $lintOutput = & pnpm run lint 2>&1 | Out-String
    }

    # Parse TypeScript errors
    $tscOutput -split "`n" | Where-Object { $_ -match "error TS\d+:" -or $_ -match "Cannot find" } | ForEach-Object {
        $typescriptErrors += $_
    }

    # Parse ESLint errors
    $lintOutput -split "`n" | Where-Object { $_ -match "error" -and $_ -notmatch "✖ \d+ problem" } | ForEach-Object {
        $lintErrors += $_
    }

    return @{
        TypeScript = $typescriptErrors
        ESLint = $lintErrors
    }
}

# Main execution
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host " The Finisher v2.0 - Error Classifier" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get errors
$errors = Get-ProjectErrors -Path $ProjectPath

# Classify all errors
$allErrors = $errors.TypeScript + $errors.ESLint

if ($allErrors.Count -eq 0) {
    Write-Host "✅ No errors found! Project is clean." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "📊 Classifying $($allErrors.Count) errors..." -ForegroundColor Cyan
Write-Host ""

foreach ($error in $allErrors) {
    $priority = Classify-Error -ErrorLine $error
    $errorClassification[$priority] += $error
}

# Output based on format
switch ($Format) {
    'json' {
        $output = @{
            Summary = @{
                Total = $allErrors.Count
                Critical = $errorClassification.Critical.Count
                High = $errorClassification.High.Count
                Medium = $errorClassification.Medium.Count
                Unknown = $errorClassification.Unknown.Count
            }
            Errors = $errorClassification
        }
        $output | ConvertTo-Json -Depth 10
    }

    'table' {
        Write-Host "┌─────────────┬───────┐" -ForegroundColor Gray
        Write-Host "│ Priority    │ Count │" -ForegroundColor Gray
        Write-Host "├─────────────┼───────┤" -ForegroundColor Gray
        Write-Host "│ CRITICAL    │ $(($errorClassification.Critical.Count).ToString().PadLeft(5)) │" -ForegroundColor Red
        Write-Host "│ HIGH        │ $(($errorClassification.High.Count).ToString().PadLeft(5)) │" -ForegroundColor Yellow
        Write-Host "│ MEDIUM      │ $(($errorClassification.Medium.Count).ToString().PadLeft(5)) │" -ForegroundColor Blue
        Write-Host "│ UNKNOWN     │ $(($errorClassification.Unknown.Count).ToString().PadLeft(5)) │" -ForegroundColor Gray
        Write-Host "├─────────────┼───────┤" -ForegroundColor Gray
        Write-Host "│ TOTAL       │ $(($allErrors.Count).ToString().PadLeft(5)) │" -ForegroundColor White
        Write-Host "└─────────────┴───────┘" -ForegroundColor Gray
    }

    'markdown' {
        Write-Host "## Error Classification Summary"
        Write-Host ""
        Write-Host "**Total Errors:** $($allErrors.Count)"
        Write-Host ""

        Write-Host "### Priority 1: CRITICAL (Fix First)"
        Write-Host "**Count:** $($errorClassification.Critical.Count)"
        Write-Host "**Impact:** Blocks build, causes runtime failures"
        Write-Host ""
        if ($errorClassification.Critical.Count -gt 0) {
            Write-Host "**Sample Errors:**"
            $errorClassification.Critical | Select-Object -First 5 | ForEach-Object {
                Write-Host "- $_"
            }
            if ($errorClassification.Critical.Count -gt 5) {
                Write-Host "- ... and $($errorClassification.Critical.Count - 5) more"
            }
        }
        Write-Host ""

        Write-Host "### Priority 2: HIGH (Fix Second)"
        Write-Host "**Count:** $($errorClassification.High.Count)"
        Write-Host "**Impact:** Code quality, maintainability issues"
        Write-Host ""
        if ($errorClassification.High.Count -gt 0) {
            Write-Host "**Sample Errors:**"
            $errorClassification.High | Select-Object -First 5 | ForEach-Object {
                Write-Host "- $_"
            }
            if ($errorClassification.High.Count -gt 5) {
                Write-Host "- ... and $($errorClassification.High.Count - 5) more"
            }
        }
        Write-Host ""

        Write-Host "### Priority 3: MEDIUM (Fix Last)"
        Write-Host "**Count:** $($errorClassification.Medium.Count)"
        Write-Host "**Impact:** Style, warnings only"
        Write-Host ""
        if ($errorClassification.Medium.Count -gt 0) {
            Write-Host "**Sample Errors:**"
            $errorClassification.Medium | Select-Object -First 5 | ForEach-Object {
                Write-Host "- $_"
            }
            if ($errorClassification.Medium.Count -gt 5) {
                Write-Host "- ... and $($errorClassification.Medium.Count - 5) more"
            }
        }
        Write-Host ""

        if ($errorClassification.Unknown.Count -gt 0) {
            Write-Host "### UNKNOWN Classification"
            Write-Host "**Count:** $($errorClassification.Unknown.Count)"
            Write-Host "**Action:** Review manually and update classification patterns"
            Write-Host ""
            Write-Host "**Sample Errors:**"
            $errorClassification.Unknown | Select-Object -First 3 | ForEach-Object {
                Write-Host "- $_"
            }
            Write-Host ""
        }

        Write-Host "---"
        Write-Host ""
        Write-Host "## Recommended Fix Order"
        Write-Host ""
        Write-Host "1. **Fix CRITICAL errors first** ($($errorClassification.Critical.Count) errors)"
        Write-Host "   - These block build and deployment"
        Write-Host "   - Highest impact on project completion"
        Write-Host ""
        Write-Host "2. **Fix HIGH priority errors** ($($errorClassification.High.Count) errors)"
        Write-Host "   - Code quality and maintainability"
        Write-Host "   - Prevents future bugs"
        Write-Host ""
        Write-Host "3. **Fix MEDIUM priority errors** ($($errorClassification.Medium.Count) errors)"
        Write-Host "   - Style and warnings"
        Write-Host "   - Can be deferred if time-constrained"
        Write-Host ""
    }
}

# Exit with error count
exit $allErrors.Count
