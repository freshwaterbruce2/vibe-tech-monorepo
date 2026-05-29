# CME Track Deployment Preflight Validator
# Run this locally in PowerShell 7+ before pushing changes to production

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "[DEPLOY] CME Track Production Deployment Preflight" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Resolve-Path "$PSScriptRoot/.."
$envPath = Join-Path $rootPath ".env"
$hasErrors = $false

# 1. Check .env file
if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] Local .env file is missing at $envPath" -ForegroundColor Red
    $hasErrors = $true
} else {
    Write-Host "[OK] Found local .env file." -ForegroundColor Green
    
    # Read variables
    $envVars = @{}
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $separator = $line.IndexOf("=")
            if ($separator -gt 0) {
                $key = $line.Substring(0, $separator).Trim()
                $value = $line.Substring($separator + 1).Trim()
                
                # Safe character check for quotes
                $doubleQuote = [char]34
                $singleQuote = [char]39
                if (($value.StartsWith($doubleQuote) -and $value.EndsWith($doubleQuote)) -or ($value.StartsWith($singleQuote) -and $value.EndsWith($singleQuote))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                $envVars[$key] = $value
            }
        }
    }

    # 2. Check AUTH_SECRET
    $authSecret = $envVars["AUTH_SECRET"]
    if (-not $authSecret) {
        Write-Host "[ERROR] AUTH_SECRET is not configured in .env" -ForegroundColor Red
        $hasErrors = $true
    } elseif ($authSecret -eq "cme-track-local-auth-secret-12345") {
        Write-Host "[WARN] AUTH_SECRET is using the default developer fallback. Use a high-entropy secret for production." -ForegroundColor Yellow
    } else {
        $authSecretLength = $authSecret.Length
        if ($authSecretLength -lt 32) {
            Write-Host "[WARN] AUTH_SECRET is short ($authSecretLength characters). Recommend at least 32 characters for security." -ForegroundColor Yellow
        } else {
            Write-Host "[OK] AUTH_SECRET is configured." -ForegroundColor Green
        }
    }

    # 3. Check Database Path for Production Volume
    $dbPath = $envVars["APP_DB_PATH"]
    if (-not $dbPath) {
         Write-Host "[WARN] APP_DB_PATH is not configured in .env. Falling back to default." -ForegroundColor Yellow
    } else {
         if (-not $dbPath.StartsWith("/") -and -not $dbPath.Contains(":\") -and -not $dbPath.StartsWith("\")) {
             Write-Host "[WARN] APP_DB_PATH looks like a relative path ($dbPath). Production requires absolute pathing." -ForegroundColor Yellow
         }
         if ($dbPath.StartsWith("D:\") -or $dbPath.Contains("databases")) {
             Write-Host "[OK] Database uses isolated disk storage locally: $dbPath" -ForegroundColor Green
             Write-Host "[NOTE] For production on Railway, configure APP_DB_PATH to point to your persistent mount, e.g. /data/cme-track.db" -ForegroundColor Cyan
         }
    }

    # 4. Check Stripe configuration
    $stripeSecret = $envVars["STRIPE_SECRET_KEY"]
    $stripePublic = $envVars["VITE_STRIPE_PUBLIC_KEY"]
    
    if (-not $stripeSecret) {
        Write-Host "[ERROR] STRIPE_SECRET_KEY is missing in .env" -ForegroundColor Red
        $hasErrors = $true
    } else {
        if ($stripeSecret.StartsWith("sk_test_")) {
            Write-Host "[OK] Stripe API Key is in TEST mode." -ForegroundColor Green
        } elseif ($stripeSecret.StartsWith("sk_live_")) {
            Write-Host "[WARN] Alert: Stripe API Key is in LIVE mode. Proceed with caution." -ForegroundColor Yellow
        } else {
            Write-Host "[ERROR] STRIPE_SECRET_KEY does not match standard Stripe secret keys." -ForegroundColor Red
            $hasErrors = $true
        }
    }

    if (-not $stripePublic) {
        Write-Host "[ERROR] VITE_STRIPE_PUBLIC_KEY is missing in .env" -ForegroundColor Red
        $hasErrors = $true
    }
}

# 5. Validate vercel.json configuration
$vercelPath = Join-Path $rootPath "vercel.json"
if (-not (Test-Path $vercelPath)) {
    Write-Host "[ERROR] vercel.json is missing at $vercelPath" -ForegroundColor Red
    $hasErrors = $true
} else {
    Write-Host "[OK] vercel.json file is present." -ForegroundColor Green
}

# 6. Validate railway.json and Dockerfile configuration
$railwayPath = Join-Path $rootPath "railway.json"
$dockerfilePath = Join-Path $rootPath "Dockerfile"

if (-not (Test-Path $railwayPath)) {
    Write-Host "[ERROR] railway.json is missing at $railwayPath" -ForegroundColor Red
    $hasErrors = $true
} else {
    Write-Host "[OK] railway.json configuration is present." -ForegroundColor Green
}

if (-not (Test-Path $dockerfilePath)) {
    Write-Host "[ERROR] Dockerfile is missing at $dockerfilePath" -ForegroundColor Red
    $hasErrors = $true
} else {
    Write-Host "[OK] Dockerfile is present." -ForegroundColor Green
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan

if ($hasErrors) {
    Write-Host "[FAIL] Preflight check FAILED. Please resolve the errors highlighted above before deploying." -ForegroundColor Red
    Exit 1
} else {
    Write-Host "[SUCCESS] Preflight check PASSED! Configurations are valid for development and staging." -ForegroundColor Green
    Write-Host "[DEPLOY] Next Steps to deploy to production:" -ForegroundColor Cyan
    Write-Host "   1. Push your monorepo branch to GitHub." -ForegroundColor Gray
    Write-Host "   2. Import the monorepo root to Vercel, setting project root to 'apps/cme-track'." -ForegroundColor Gray
    Write-Host "   3. Set Vercel environment variables including VITE_API_BASE_URL and VITE_STRIPE_PUBLIC_KEY." -ForegroundColor Gray
    Write-Host "   4. Create a Railway service with a Persistent Volume mounted at '/data'." -ForegroundColor Gray
    Write-Host "   5. Configure APP_DB_PATH = /data/cme-track.db in Railway service settings." -ForegroundColor Gray
    Write-Host "   6. Configure Stripe Webhooks pointing to your Railway backend: https://<railway-domain>/api/webhooks/stripe." -ForegroundColor Gray
}
