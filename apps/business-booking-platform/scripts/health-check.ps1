# Health Check Script for Hotel Booking Project (PowerShell)

Write-Host "🏥 Running project health check..." -ForegroundColor Cyan
Write-Host ""

# Function to check command existence
function Test-CommandExists {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check Node.js
if (Test-CommandExists node) {
    $nodeVersion = node -v 2>$null
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js: Not installed" -ForegroundColor Red
}

# Check pnpm
if (Test-CommandExists pnpm) {
    $pnpmVersion = pnpm -v 2>$null
    Write-Host "✅ pnpm: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ pnpm: Not installed" -ForegroundColor Red
}

# Check npm (fallback)
if (Test-CommandExists npm) {
    $npmVersion = npm -v 2>$null
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm: Not installed" -ForegroundColor Red
}

# Check Git
if (Test-CommandExists git) {
    $gitVersion = git --version 2>$null
    $gitVersion = $gitVersion -replace 'git version ', ''
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Git: Not installed" -ForegroundColor Red
}

Write-Host ""
Write-Host "📦 Dependency Status:" -ForegroundColor Yellow

# Check if node_modules exists
if (Test-Path -Path "node_modules" -PathType Container) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green

    # Check for outdated packages
    $outdated = pnpm outdated --json 2>$null | ConvertFrom-Json
    if ($null -eq $outdated -or $outdated.Count -eq 0) {
        Write-Host "✅ All dependencies up to date" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some dependencies are outdated. Run 'pnpm outdated' for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Dependencies not installed. Run 'pnpm install'" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔍 Code Quality:" -ForegroundColor Yellow

# Run type check
$typeCheckResult = pnpm run typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript: No type errors" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript: Type errors found. Run 'pnpm run typecheck'" -ForegroundColor Red
}

# Run linting
$lintResult = pnpm run lint 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ESLint: No linting issues" -ForegroundColor Green
} else {
    Write-Host "⚠️  ESLint: Linting issues found. Run 'pnpm run lint'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Test Status:" -ForegroundColor Yellow

# Run tests
$testResult = pnpm test -- --run 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tests: All tests passing" -ForegroundColor Green
} else {
    Write-Host "❌ Tests: Some tests failing. Run 'pnpm test'" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏗️  Build Status:" -ForegroundColor Yellow

# Check if dist directory exists
if (Test-Path -Path "dist" -PathType Container) {
    Write-Host "✅ Build artifacts exist" -ForegroundColor Green

    # Check build age
    if (Test-Path -Path "dist\index.html") {
        $buildFile = Get-Item "dist\index.html"
        $buildAge = [int]((Get-Date) - $buildFile.LastWriteTime).TotalMinutes
        if ($buildAge -gt 1440) {
            Write-Host "⚠️  Build is more than 24 hours old" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Build is recent ($buildAge minutes old)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠️  No build artifacts. Run 'pnpm run build'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🪝 Git Hooks:" -ForegroundColor Yellow

# Check if Husky is installed
if (Test-Path -Path ".husky" -PathType Container) {
    Write-Host "✅ Husky hooks installed" -ForegroundColor Green
} else {
    Write-Host "❌ Husky hooks not installed. Run 'npx husky install'" -ForegroundColor Red
}

# Additional Windows-specific checks
Write-Host ""
Write-Host "💾 Windows Environment:" -ForegroundColor Yellow

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion.ToString()
Write-Host "✅ PowerShell: $psVersion" -ForegroundColor Green

# Check disk space
$drive = Get-PSDrive -Name C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeSpaceGB -lt 5) {
    Write-Host "⚠️  Low disk space: $freeSpaceGB GB free" -ForegroundColor Yellow
} else {
    Write-Host "✅ Disk space: $freeSpaceGB GB free" -ForegroundColor Green
}

# Check Desktop Commander v2 availability
if (Test-Path -Path "C:\dev\desktop-commander-v2\mcp-server\dist\index.js") {
    Write-Host "✅ Desktop Commander v2 available" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Desktop Commander v2 not available" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📊 Health check complete!" -ForegroundColor Green