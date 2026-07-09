# Pre-push CI parity gate.
#
# Runs the exact same project-selection + lint/typecheck/test steps as CI's
# "Quality Gates" job (via scripts/ci-local.mjs) before allowing a push. This
# closes the "green locally, red on GitHub" gap that came from the pre-commit
# hook (staged-file scope) and CI (whole-diff-vs-origin/main scope) checking
# different things.
#
# Bypass (emergency only): git push --no-verify

$ErrorActionPreference = 'Stop'

Write-Host "`n=== Pre-Push CI Parity Gate ===" -ForegroundColor Cyan

try {
    git fetch origin main --quiet 2>$null
} catch {
    Write-Host 'pre-push: could not fetch origin/main; comparing against local copy.' -ForegroundColor Yellow
}

node scripts/ci-local.mjs --base origin/main --head HEAD
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "`nci:local failed - this push would likely fail CI's Quality Gates check." -ForegroundColor Red
    Write-Host "Fix the above, or bypass with 'git push --no-verify' (not recommended)." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nPre-push parity gate passed." -ForegroundColor Green
exit 0
