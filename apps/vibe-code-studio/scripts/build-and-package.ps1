# 📦 Vibe Code Studio - Build & Package Script
# Version: 1.0.0
# Date: January 3, 2026

Write-Host "🚀 Vibe Code Studio - Build & Package Process" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ProjectRoot = "C:\dev\apps\vibe-code-studio"
$OutputDir = "C:\dev\apps\vibe-code-studio\dist-electron"
$BuildLog = "C:\dev\apps\vibe-code-studio\build_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Start logging
Start-Transcript -Path $BuildLog

Write-Host "📍 Project Directory: $ProjectRoot" -ForegroundColor Yellow
Write-Host "📍 Output Directory: $OutputDir" -ForegroundColor Yellow
Write-Host "📍 Build Log: $BuildLog" -ForegroundColor Yellow
Write-Host ""

# Step 1: Clean previous builds
Write-Host "🧹 Step 1: Cleaning previous builds..." -ForegroundColor Green
try {
    Set-Location $ProjectRoot
    if (Test-Path $OutputDir) {
        Remove-Item -Path $OutputDir -Recurse -Force
        Write-Host "   ✅ Removed existing dist-electron directory" -ForegroundColor Gray
    }
    if (Test-Path "out") {
        Remove-Item -Path "out" -Recurse -Force
        Write-Host "   ✅ Removed existing out directory" -ForegroundColor Gray
    }
    if (Test-Path "dist") {
        Remove-Item -Path "dist" -Recurse -Force
        Write-Host "   ✅ Removed existing dist directory" -ForegroundColor Gray
    }
    Write-Host "   ✅ Clean completed successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ❌ Error during clean: $_" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# Step 2: Type checking
Write-Host "🔍 Step 2: Running TypeScript type check..." -ForegroundColor Green
try {
    $typecheck = npm run typecheck 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️ Type check warnings (continuing build)" -ForegroundColor Yellow
        Write-Host $typecheck -ForegroundColor Gray
    } else {
        Write-Host "   ✅ Type check passed" -ForegroundColor Green
    }
    Write-Host ""
} catch {
    Write-Host "   ⚠️ Type check failed (continuing build)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Build the application
Write-Host "🔨 Step 3: Building application..." -ForegroundColor Green
try {
    Write-Host "   📦 Building renderer (React UI)..." -ForegroundColor Yellow
    npm run build:renderer
    if ($LASTEXITCODE -ne 0) {
        throw "Renderer build failed"
    }
    Write-Host "   ✅ Renderer build completed" -ForegroundColor Green
    
    Write-Host "   📦 Building main process (Electron)..." -ForegroundColor Yellow
    npm run build:main
    if ($LASTEXITCODE -ne 0) {
        throw "Main process build failed"
    }
    Write-Host "   ✅ Main process build completed" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ❌ Build failed: $_" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# Step 4: Verify build outputs
Write-Host "✅ Step 4: Verifying build outputs..." -ForegroundColor Green
try {
    $distExists = Test-Path "dist"
    $outExists = Test-Path "out"
    
    if ($distExists) {
        Write-Host "   ✅ Renderer output (dist) exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Renderer output (dist) missing!" -ForegroundColor Red
        throw "Missing renderer output"
    }
    
    if ($outExists) {
        Write-Host "   ✅ Main process output (out) exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Main process output (out) missing!" -ForegroundColor Red
        throw "Missing main process output"
    }
    Write-Host ""
} catch {
    Write-Host "   ❌ Build verification failed: $_" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# Step 5: Package with Electron Builder
Write-Host "📦 Step 5: Packaging with Electron Builder..." -ForegroundColor Green
try {
    Write-Host "   Creating Windows installers..." -ForegroundColor Yellow
    npm run electron:build:win
    if ($LASTEXITCODE -ne 0) {
        throw "Electron Builder packaging failed"
    }
    Write-Host "   ✅ Packaging completed successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ❌ Packaging failed: $_" -ForegroundColor Red
    Stop-Transcript
    exit 1
}

# Step 6: List output files
Write-Host "📋 Step 6: Build artifacts created:" -ForegroundColor Green
try {
    if (Test-Path $OutputDir) {
        Get-ChildItem -Path $OutputDir -Recurse -File | ForEach-Object {
            $size = "{0:N2} MB" -f ($_.Length / 1MB)
            Write-Host "   📄 $($_.Name) - $size" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Output directory not found" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "   ⚠️ Could not list output files" -ForegroundColor Yellow
    Write-Host ""
}

# Step 7: Success summary
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Installation files available in:" -ForegroundColor Yellow
Write-Host "   $OutputDir" -ForegroundColor White
Write-Host ""
Write-Host "📝 Build log saved to:" -ForegroundColor Yellow
Write-Host "   $BuildLog" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Ready to install Vibe Code Studio!" -ForegroundColor Green
Write-Host ""

# Stop logging
Stop-Transcript

# Optional: Open output directory
$openFolder = Read-Host "Open output folder? (Y/N)"
if ($openFolder -eq "Y" -or $openFolder -eq "y") {
    explorer $OutputDir
}
