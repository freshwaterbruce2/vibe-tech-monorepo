# Setup Ollama with D:\ drive model storage
# Run this BEFORE installing Ollama, or after to relocate models

param(
    [switch]$DownloadOnly,
    [switch]$SkipDownload
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ollama D:\ Drive Setup for VibeTech" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create D:\ollama\models directory
$ollamaModelsPath = "D:\ollama\models"
if (-not (Test-Path $ollamaModelsPath)) {
    New-Item -Path $ollamaModelsPath -ItemType Directory -Force | Out-Null
    Write-Host "[OK] Created $ollamaModelsPath" -ForegroundColor Green
} else {
    Write-Host "[OK] $ollamaModelsPath already exists" -ForegroundColor Green
}

# Step 2: Set OLLAMA_MODELS environment variable (user-level, persists across reboots)
$currentValue = [System.Environment]::GetEnvironmentVariable("OLLAMA_MODELS", "User")
if ($currentValue -ne $ollamaModelsPath) {
    [System.Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $ollamaModelsPath, "User")
    $env:OLLAMA_MODELS = $ollamaModelsPath
    Write-Host "[OK] Set OLLAMA_MODELS=$ollamaModelsPath (user environment)" -ForegroundColor Green
} else {
    Write-Host "[OK] OLLAMA_MODELS already set to $ollamaModelsPath" -ForegroundColor Green
}

# Step 3: Download Ollama installer if needed
$installerPath = "D:\ollama\OllamaSetup.exe"
if (-not $SkipDownload) {
    if (-not (Test-Path $installerPath)) {
        Write-Host ""
        Write-Host "Downloading Ollama installer to D:\ollama\..." -ForegroundColor Yellow
        try {
            $url = "https://ollama.com/download/OllamaSetup.exe"
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $url -OutFile $installerPath -UseBasicParsing
            $ProgressPreference = 'Continue'
            $size = [math]::Round((Get-Item $installerPath).Length / 1MB, 1)
            Write-Host "[OK] Downloaded OllamaSetup.exe (${size} MB)" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Download failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  Manual download: https://ollama.com/download/windows" -ForegroundColor Yellow
        }
    } else {
        $size = [math]::Round((Get-Item $installerPath).Length / 1MB, 1)
        Write-Host "[OK] Installer already downloaded (${size} MB)" -ForegroundColor Green
    }
}

if ($DownloadOnly) {
    Write-Host ""
    Write-Host "Download complete. Run installer manually:" -ForegroundColor Cyan
    Write-Host "  Start-Process '$installerPath'" -ForegroundColor White
    exit 0
}

# Step 4: Check if Ollama is already installed
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollamaInstalled) {
    Write-Host "[OK] Ollama is already installed" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "  ACTION REQUIRED: Install Ollama" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""
    if (Test-Path $installerPath) {
        Write-Host "Run the installer:" -ForegroundColor White
        Write-Host "  Start-Process '$installerPath'" -ForegroundColor Cyan
        Write-Host ""
        $run = Read-Host "Run installer now? (y/n)"
        if ($run -eq 'y') {
            Write-Host "Launching installer..." -ForegroundColor Yellow
            Start-Process $installerPath -Wait
        }
    } else {
        Write-Host "Download from: https://ollama.com/download/windows" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "After installing, restart this script or run:" -ForegroundColor White
    Write-Host "  ollama pull nomic-embed-text" -ForegroundColor Cyan
    exit 0
}

# Step 5: Verify OLLAMA_MODELS is being used
Write-Host ""
Write-Host "Verifying model storage location..." -ForegroundColor Yellow
$modelDir = $env:OLLAMA_MODELS
if ($modelDir -eq $ollamaModelsPath) {
    Write-Host "[OK] Models will be stored at: $modelDir" -ForegroundColor Green
} else {
    Write-Host "[WARN] OLLAMA_MODELS not active in this session" -ForegroundColor Yellow
    Write-Host "  Restart terminal, then re-run this script" -ForegroundColor Yellow
}

# Step 6: Pull nomic-embed-text model
Write-Host ""
Write-Host "Pulling nomic-embed-text embedding model (~274 MB)..." -ForegroundColor Yellow
Write-Host "This will download to: $ollamaModelsPath" -ForegroundColor Gray
Write-Host ""
& ollama pull nomic-embed-text

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] nomic-embed-text model ready!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Model pull failed. Try manually:" -ForegroundColor Red
    Write-Host "  ollama pull nomic-embed-text" -ForegroundColor Cyan
    exit 1
}

# Step 7: Test embedding generation
Write-Host ""
Write-Host "Testing embedding generation..." -ForegroundColor Yellow
try {
    $testBody = '{"model": "nomic-embed-text", "prompt": "Hello VibeTech memory system"}'
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/embeddings" -Method Post -Body $testBody -ContentType "application/json"
    $dims = $response.embedding.Count
    Write-Host "[OK] Embedding test passed! Dimensions: $dims" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Embedding test failed (Ollama service may need restart)" -ForegroundColor Yellow
    Write-Host "  Try: ollama serve" -ForegroundColor Cyan
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Ollama Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Models stored at: $ollamaModelsPath" -ForegroundColor White
Write-Host "  API endpoint:     http://localhost:11434" -ForegroundColor White
Write-Host "  Embedding model:  nomic-embed-text (768d)" -ForegroundColor White
Write-Host "  C:\ drive impact: ~1.2 GB (installer only)" -ForegroundColor White
Write-Host "  D:\ drive usage:  ~274 MB (models)" -ForegroundColor White
Write-Host ""
Write-Host "Next step: Continue with Phase 1 of the memory system!" -ForegroundColor Cyan
