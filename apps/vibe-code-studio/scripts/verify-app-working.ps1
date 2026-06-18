# PowerShell script to verify DeepCode Editor is working
# Run from V:\monorepo\projects\desktop-apps\deepcode-editor

Write-Host "Verifying DeepCode Editor application..." -ForegroundColor Cyan
Set-Location "V:\monorepo\projects\desktop-apps\deepcode-editor"

# Check Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Check npm dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Run TypeScript check
Write-Host "🔍 Running TypeScript check..." -ForegroundColor Yellow
npm run typecheck

# Run build test
Write-Host "🏗️ Testing build process..." -ForegroundColor Yellow
npm run build

# Run basic tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test

Write-Host "✅ DeepCode Editor verification completed!" -ForegroundColor Green