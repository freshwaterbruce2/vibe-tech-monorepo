# Hotel Booking Project Setup Script (PowerShell)

Write-Host "🏨 Setting up Hotel Booking Project..." -ForegroundColor Cyan

# Check Node.js version
$requiredNodeVersion = 20
$nodeVersion = node -v 2>$null

if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed. Please install Node.js version $requiredNodeVersion or higher." -ForegroundColor Red
    exit 1
}

$currentNodeVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')

if ($currentNodeVersion -lt $requiredNodeVersion) {
    Write-Host "❌ Node.js version $requiredNodeVersion or higher is required. Current version: $currentNodeVersion" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version check passed" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Set up git hooks
Write-Host "🪝 Setting up git hooks..." -ForegroundColor Yellow
npx husky install
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Failed to set up git hooks" -ForegroundColor Yellow
    # Don't exit - this is not critical
}

# Run initial build
Write-Host "🔨 Running initial build..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Run type check
Write-Host "🔍 Running type check..." -ForegroundColor Yellow
pnpm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
pnpm test -- --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Some tests failed" -ForegroundColor Yellow
    # Don't exit - tests might be expected to fail initially
}

# Run linting
Write-Host "🧹 Running linting..." -ForegroundColor Yellow
pnpm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Linting issues found" -ForegroundColor Yellow
    # Don't exit - linting issues can be fixed
}

Write-Host "`n✅ Setup complete! You're ready to start developing." -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  pnpm run dev       - Start development server" -ForegroundColor White
Write-Host "  pnpm run build     - Build for production" -ForegroundColor White
Write-Host "  pnpm test          - Run tests" -ForegroundColor White
Write-Host "  pnpm run lint      - Run linting" -ForegroundColor White
Write-Host "  pnpm run typecheck - Run TypeScript type checking" -ForegroundColor White