Write-Host "Verifying Vibe Code Studio Environment..." -ForegroundColor Cyan

# 1. Check Node & NPM
try {
    $nodeVersion = node -v
    Write-Host "Node Version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js not found."
    exit 1
}

# 2. Check Critical Files
$criticalFiles = @(
    "package.json",
    "electron.vite.config.ts",
    "src/main/index.ts",
    "src/renderer/index.html",
    "src/components/EnhancedAgentMode/EnhancedAgentMode.tsx",
    "src/services/DeepSeekService.ts"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] Found $file" -ForegroundColor Green
    } else {
        Write-Error "[MISSING] $file"
        exit 1
    }
}

# 3. Final Type Check (Quick)
Write-Host "Running Type Check..." -ForegroundColor Yellow
try {
    npm run typecheck
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Type check passed" -ForegroundColor Green
    } else {
        Write-Error "Type check failed"
        exit 1
    }
} catch {
    Write-Error "Failed to run typecheck"
    exit 1
}

Write-Host "Verification Complete. Ready for Build." -ForegroundColor Cyan
