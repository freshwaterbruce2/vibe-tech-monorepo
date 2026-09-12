# Deploy Vibe AI Gateway to Google Cloud Run
# Usage:
#   .\deploy.ps1 [-Project <gcp_project>] [-Region <gcp_region>]

param (
    [string]$Project = "vibe-tutor-501213",
    [string]$Region = "us-east4",
    [string]$ServiceName = "vibe-ai-gateway"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Deploying Vibe AI Gateway to Cloud Run   " -ForegroundColor Cyan
Write-Host " Service: $ServiceName                    " -ForegroundColor Cyan
Write-Host " Project: $Project                        " -ForegroundColor Cyan
Write-Host " Region:  $Region                         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure gcloud is authenticated
Write-Host "`n[1/3] Verifying gcloud authentication..." -ForegroundColor Yellow
gcloud config set project $Project

# 2. Deploy directly from source
Write-Host "`n[2/3] Building and deploying container to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --source . `
    --project $Project `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 60s `
    --set-env-vars NODE_ENV=production

# 3. Retrieve deployment URL
Write-Host "`n[3/3] Fetching service URL..." -ForegroundColor Yellow
$serviceUrl = gcloud run services describe $ServiceName --project $Project --region $Region --format 'value(status.url)'

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Vibe AI Gateway Deployed Successfully!   " -ForegroundColor Green
Write-Host " Endpoint URL: $serviceUrl                " -ForegroundColor Green
Write-Host " Health Check: $serviceUrl/health         " -ForegroundColor Green
Write-Host " Completions:  $serviceUrl/v1/chat/completions" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "NOTE: Remember to set OPENROUTER_API_KEY in Cloud Run Console or Secret Manager." -ForegroundColor Gray
