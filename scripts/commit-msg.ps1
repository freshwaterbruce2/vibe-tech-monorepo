# VibeTech Monorepo Commit Message Hook
# Validates commit messages follow Conventional Commits specification.

$ErrorActionPreference = "Stop"

$commitMsgFile = $args[0]

if (-not $commitMsgFile -or -not (Test-Path -LiteralPath $commitMsgFile)) {
    Write-Host "ERROR: Commit message file not provided or not found." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Commit Message Validation ===" -ForegroundColor Cyan
Write-Host "Checking conventional commit format..." -ForegroundColor Yellow

try {
    $output = pnpm exec commitlint --edit "$commitMsgFile" 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Host $output -ForegroundColor Red
        Write-Host "`n=== Commit message validation FAILED ===" -ForegroundColor Red
        Write-Host "Expected format: <type>(<scope>): <subject>" -ForegroundColor Yellow
        Write-Host "  type   : feat, fix, docs, style, refactor, perf, test, chore, revert, build, ci" -ForegroundColor DarkGray
        Write-Host "  scope  : optional, lowercase (e.g., nova-agent, shared, backend)" -ForegroundColor DarkGray
        Write-Host "  subject: lowercase, no trailing period, max 72 chars" -ForegroundColor DarkGray
        Write-Host "`nExamples:" -ForegroundColor DarkGray
        Write-Host "  feat(nova-agent): add dark mode toggle" -ForegroundColor DarkGray
        Write-Host "  fix(shared): resolve ipc timeout issue" -ForegroundColor DarkGray
        Write-Host "  docs: update contributing guidelines" -ForegroundColor DarkGray
        Write-Host "`nTo bypass (emergency only): git commit --no-verify" -ForegroundColor DarkGray
        exit 1
    }

    Write-Host "Commit message format valid." -ForegroundColor Green
    Write-Host "=== Validation passed ===" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "ERROR: commitlint execution failed: $_" -ForegroundColor Red
    exit 1
}
