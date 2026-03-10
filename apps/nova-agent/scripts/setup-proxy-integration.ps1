# NOVA Agent - OpenRouter Proxy Integration Setup
# Configures NOVA Agent to use the local OpenRouter proxy

param(
    [string]$OpenRouterApiKey = "",
    [switch]$SkipProxySetup
)

$ErrorActionPreference = "Stop"
$ProxyDir = "C:\dev\backend\openrouter-proxy"
$NovaEnvFile = "C:\dev\apps\nova-agent\src-tauri\.env"
$ProxyEnvFile = "$ProxyDir\.env"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     NOVA AGENT - OPENROUTER PROXY SETUP                   ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Cyan"

try {
    # Step 1: Configure OpenRouter Proxy
    if (-not $SkipProxySetup) {
        Write-ColorOutput "📦 Step 1: Configuring OpenRouter Proxy..." "Yellow"
        
        if (-not (Test-Path $ProxyDir)) {
            throw "OpenRouter proxy not found at: $ProxyDir"
        }
        
        # Get API key if not provided
        if (-not $OpenRouterApiKey) {
            Write-ColorOutput "`n🔑 OpenRouter API Key Required" "Cyan"
            Write-ColorOutput "  Get your free API key at: https://openrouter.ai/keys" "Gray"
            $OpenRouterApiKey = Read-Host "`nEnter your OpenRouter API key (sk-or-v1-...)"
            
            if (-not $OpenRouterApiKey -or -not $OpenRouterApiKey.StartsWith("sk-or-v1-")) {
                throw "Invalid OpenRouter API key format"
            }
        }
        
        # Create proxy .env file
        Write-ColorOutput "  Creating proxy .env file..." "Gray"
        $proxyEnvContent = @"
# OpenRouter Proxy Configuration
OPENROUTER_API_KEY=$OpenRouterApiKey
PORT=3001
NODE_ENV=development

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=60
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
LOG_DIR=D:\logs\openrouter-proxy
"@
        $proxyEnvContent | Out-File -FilePath $ProxyEnvFile -Encoding UTF8 -Force
        Write-ColorOutput "  ✓ Proxy .env created: $ProxyEnvFile" "Green"
        
        # Install proxy dependencies
        Write-ColorOutput "  Installing proxy dependencies..." "Gray"
        Push-Location $ProxyDir
        pnpm install --silent
        if ($LASTEXITCODE -ne 0) { throw "Failed to install proxy dependencies" }
        Pop-Location
        Write-ColorOutput "  ✓ Proxy dependencies installed" "Green"
    }
    else {
        Write-ColorOutput "⏭️  Skipping proxy setup" "Yellow"
    }
    
    # Step 2: Configure NOVA Agent
    Write-ColorOutput "`n📦 Step 2: Configuring NOVA Agent..." "Yellow"
    
    if (-not (Test-Path $NovaEnvFile)) {
        Write-ColorOutput "  Creating NOVA Agent .env file..." "Gray"
        $novaEnvContent = @"
DATABASE_PATH=D:\\databases
DEEPSEEK_API_KEY=
GROQ_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
GROQ_BASE_URL=https://api.groq.com/openai/v1
ENABLE_THINKING_MODE=true
NOVA_ENABLE_CODE_EXEC=true

# OpenRouter Configuration (via local proxy)
# The proxy server at localhost:3001 handles authentication
# Real API key is stored in C:\dev\backend\openrouter-proxy\.env
OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter
OPENROUTER_API_KEY=proxy-handled
"@
        $novaEnvContent | Out-File -FilePath $NovaEnvFile -Encoding UTF8 -Force
        Write-ColorOutput "  ✓ NOVA Agent .env created: $NovaEnvFile" "Green"
    }
    else {
        # Update existing .env file
        Write-ColorOutput "  Updating existing .env file..." "Gray"
        $content = Get-Content $NovaEnvFile -Raw
        
        # Update or add OpenRouter configuration
        if ($content -match "OPENROUTER_BASE_URL=") {
            $content = $content -replace "OPENROUTER_BASE_URL=.*", "OPENROUTER_BASE_URL=http://localhost:3001/api/openrouter"
        }
        else {
            $content += "`nOPENROUTER_BASE_URL=http://localhost:3001/api/openrouter"
        }
        
        if ($content -match "OPENROUTER_API_KEY=") {
            $content = $content -replace "OPENROUTER_API_KEY=.*", "OPENROUTER_API_KEY=proxy-handled"
        }
        else {
            $content += "`nOPENROUTER_API_KEY=proxy-handled"
        }
        
        $content | Out-File -FilePath $NovaEnvFile -Encoding UTF8 -Force
        Write-ColorOutput "  ✓ NOVA Agent .env updated: $NovaEnvFile" "Green"
    }
    
    # Step 3: Test proxy connection
    Write-ColorOutput "`n🧪 Step 3: Testing proxy..." "Yellow"
    
    Write-ColorOutput "  Starting proxy server..." "Gray"
    Push-Location $ProxyDir
    $proxyJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        pnpm run dev
    } -ArgumentList $ProxyDir
    Pop-Location
    
    # Wait for proxy to start
    Start-Sleep -Seconds 5
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
        if ($health.status -eq "ok") {
            Write-ColorOutput "  ✓ Proxy is running and healthy!" "Green"
            Write-ColorOutput "    URL: http://localhost:3001" "Gray"
            Write-ColorOutput "    Uptime: $([math]::Round($health.uptime, 2))s" "Gray"
        }
    }
    catch {
        Write-ColorOutput "  ⚠️  Could not connect to proxy (this is normal if it's not running)" "Yellow"
    }
    finally {
        # Stop the test proxy
        if ($proxyJob) {
            Stop-Job $proxyJob
            Remove-Job $proxyJob
        }
    }
    
    # Summary
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║     ✅ SETUP COMPLETE!                                     ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Green"
    
    Write-ColorOutput "📊 Configuration Summary:" "Cyan"
    Write-ColorOutput "  Proxy Directory: $ProxyDir" "White"
    Write-ColorOutput "  Proxy URL: http://localhost:3001" "White"
    Write-ColorOutput "  NOVA Agent Config: $NovaEnvFile" "White"
    
    Write-ColorOutput "`n🚀 Next Steps:" "Cyan"
    Write-ColorOutput "  1. Start the proxy:" "White"
    Write-ColorOutput "     cd $ProxyDir" "Gray"
    Write-ColorOutput "     pnpm run dev" "Gray"
    Write-ColorOutput "`n  2. Start NOVA Agent:" "White"
    Write-ColorOutput "     cd C:\dev\apps\nova-agent" "Gray"
    Write-ColorOutput "     pnpm tauri dev" "Gray"
    
    Write-ColorOutput "`n📚 Documentation:" "Cyan"
    Write-ColorOutput "  • OPENROUTER_PROXY_SETUP.md - Full integration guide" "White"
    Write-ColorOutput "  • QUICK_SETUP_2026.md - Quick reference" "White"
    
    exit 0
}
catch {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Red"
    Write-ColorOutput "║     ❌ SETUP FAILED                                        ║" "Red"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Red"
    Write-ColorOutput "Error: $_" "Red"
    exit 1
}

