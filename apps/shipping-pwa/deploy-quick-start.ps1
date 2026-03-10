# Quick Start Deployment Script for DC8980 Shipping PWA
# PowerShell script for Windows development

Write-Host "🚀 DC8980 Shipping PWA - Quick Deployment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if running as administrator (optional but recommended)
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Running without administrator privileges. Some operations may fail." -ForegroundColor Yellow
}

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Step 1: Check prerequisites
Write-Host "`n📋 Checking Prerequisites..." -ForegroundColor Green

$hasNode = Test-Command "node"
$hasNpm = Test-Command "npm"
$hasWrangler = Test-Command "wrangler"

if (-not $hasNode) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

if (-not $hasNpm) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $(node --version)" -ForegroundColor Green
Write-Host "✅ npm version: $(npm --version)" -ForegroundColor Green

if (-not $hasWrangler) {
    Write-Host "⚠️  Wrangler not found globally. Using local version." -ForegroundColor Yellow
}

# Step 2: Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Green
    npm install
} else {
    Write-Host "`n✅ Dependencies already installed" -ForegroundColor Green
}

# Step 3: Build the application
Write-Host "`n🔨 Building application..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Step 4: Login to Cloudflare (if not already)
Write-Host "`n☁️  Checking Cloudflare authentication..." -ForegroundColor Green
$wranglerWhoami = npx wrangler whoami 2>&1

if ($wranglerWhoami -match "Not logged in") {
    Write-Host "Please login to Cloudflare..." -ForegroundColor Yellow
    npx wrangler login
} else {
    Write-Host "✅ Already authenticated with Cloudflare" -ForegroundColor Green
}

# Step 5: Create D1 Database (if not exists)
Write-Host "`n🗄️  Setting up D1 Database..." -ForegroundColor Green
$dbList = npx wrangler d1 list 2>&1

if ($dbList -notmatch "dc8980-shipping-db") {
    Write-Host "Creating new D1 database..." -ForegroundColor Yellow
    $dbCreate = npx wrangler d1 create dc8980-shipping-db 2>&1

    if ($dbCreate -match "database_id: (.+)") {
        $databaseId = $matches[1].Trim()
        Write-Host "✅ Database created with ID: $databaseId" -ForegroundColor Green
        Write-Host "📝 Please update database_id in wrangler.toml with: $databaseId" -ForegroundColor Yellow

        # Prompt to update wrangler.toml
        $update = Read-Host "Would you like to update wrangler.toml now? (y/n)"
        if ($update -eq 'y') {
            $wranglerContent = Get-Content "wrangler.toml" -Raw
            $wranglerContent = $wranglerContent -replace 'database_id = "YOUR_DATABASE_ID"', "database_id = `"$databaseId`""
            Set-Content "wrangler.toml" $wranglerContent
            Write-Host "✅ wrangler.toml updated" -ForegroundColor Green
        }
    }
} else {
    Write-Host "✅ Database already exists" -ForegroundColor Green
}

# Step 6: Run migrations
Write-Host "`n🔄 Running database migrations..." -ForegroundColor Green
npx wrangler d1 migrations apply dc8980-shipping-db --local

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Local migrations completed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migration failed. This is normal for first run." -ForegroundColor Yellow
}

# Step 7: Create KV namespaces
Write-Host "`n📚 Setting up KV namespaces..." -ForegroundColor Green
$kvList = npx wrangler kv:namespace list 2>&1

if ($kvList -notmatch "SESSIONS") {
    Write-Host "Creating SESSIONS namespace..." -ForegroundColor Yellow
    $kvCreate = npx wrangler kv:namespace create "SESSIONS" 2>&1

    if ($kvCreate -match "id = `"(.+)`"") {
        $kvId = $matches[1]
        Write-Host "✅ KV namespace created with ID: $kvId" -ForegroundColor Green
        Write-Host "📝 Please update SESSIONS id in wrangler.toml with: $kvId" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ KV namespace already exists" -ForegroundColor Green
}

# Step 8: Set up environment variables
Write-Host "`n🔐 Setting up environment secrets..." -ForegroundColor Green
Write-Host "You'll need to manually set the following secrets:" -ForegroundColor Yellow
Write-Host "  - SQUARE_ACCESS_TOKEN" -ForegroundColor White
Write-Host "  - SQUARE_WEBHOOK_SECRET" -ForegroundColor White
Write-Host "  - SENDGRID_API_KEY" -ForegroundColor White
Write-Host "  - JWT_SECRET" -ForegroundColor White
Write-Host "  - ADMIN_PASSWORD_HASH" -ForegroundColor White

$setupSecrets = Read-Host "`nWould you like to set up secrets now? (y/n)"
if ($setupSecrets -eq 'y') {
    # JWT Secret
    Write-Host "`nGenerating JWT_SECRET..." -ForegroundColor Green
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    Write-Host "Generated JWT_SECRET: $jwtSecret" -ForegroundColor Cyan
    $jwtSecret | npx wrangler secret put JWT_SECRET

    # Admin Password
    Write-Host "`nSetting up admin password..." -ForegroundColor Green
    $adminPassword = Read-Host "Enter admin password" -AsSecureString
    $adminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))

    # Generate bcrypt hash (using Node.js)
    $hashScript = @"
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('$adminPasswordPlain', 10);
console.log(hash);
"@

    $hashScript | node -e ($hashScript) | npx wrangler secret put ADMIN_PASSWORD_HASH

    Write-Host "✅ Basic secrets configured" -ForegroundColor Green
    Write-Host "⚠️  Remember to add Square and SendGrid keys manually" -ForegroundColor Yellow
}

# Step 9: Test deployment locally
Write-Host "`n🧪 Testing local deployment..." -ForegroundColor Green
Write-Host "Starting local Workers development server..." -ForegroundColor Cyan

$testLocal = Read-Host "Would you like to test locally now? (y/n)"
if ($testLocal -eq 'y') {
    Write-Host "`n📡 Starting Cloudflare Workers dev server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    npx wrangler dev
}

# Step 10: Deploy to production
Write-Host "`n🚀 Ready for deployment!" -ForegroundColor Green
Write-Host "To deploy to production, run:" -ForegroundColor Cyan
Write-Host "  Frontend: npm run pages:deploy" -ForegroundColor White
Write-Host "  Backend:  npm run worker:deploy:production" -ForegroundColor White
Write-Host "  Staging:  npm run worker:deploy:staging" -ForegroundColor White

# Step 11: Mobile deployment info
Write-Host "`n📱 Mobile Deployment:" -ForegroundColor Green
Write-Host "  Android: npm run android:bundle" -ForegroundColor White
Write-Host "  iOS:     npm run ios:build" -ForegroundColor White

# Summary
Write-Host "`n✨ Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update wrangler.toml with your database and KV IDs" -ForegroundColor White
Write-Host "2. Add your Square and SendGrid API keys" -ForegroundColor White
Write-Host "3. Deploy to Cloudflare Pages and Workers" -ForegroundColor White
Write-Host "4. Configure your custom domain" -ForegroundColor White
Write-Host "5. Submit mobile apps to stores" -ForegroundColor White

Write-Host "`n📚 Full documentation: DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host "Good luck with your launch! 🎉" -ForegroundColor Green