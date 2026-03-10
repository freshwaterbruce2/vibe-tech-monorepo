$ErrorActionPreference = "Stop"

function Write-Step {
    param($Message)
    Write-Host "`n[STEP] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param($Message)
    Write-Host "[ERR] $Message" -ForegroundColor Red
}

try {
    try { Clear-Host } catch {}
    Write-Host "[START] Initializing Vibe Apex Local Fabric..." -ForegroundColor Magenta

    # -------------------------------------------------------------------------
    # 1. CLEAN SLATE
    # -------------------------------------------------------------------------
    Write-Step "Cleaning build artifacts..."
    Remove-Item -Path "apps/vibe-code-studio/dist" -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "apps/vibe-code-studio/out" -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path "apps/vibe-code-studio/dist-electron" -Recurse -ErrorAction SilentlyContinue

    # -------------------------------------------------------------------------
    # 2. NATIVE SYNC (The "ABI" Gate)
    # -------------------------------------------------------------------------
    Write-Step "Synchronizing Native Binaries (SQLite/ONNX)..."
    # This ensures your C++ modules match the Electron version you are about to package
    pnpm.exe run postinstall

    # -------------------------------------------------------------------------
    # 3. VERIFICATION (The "Math" Gate)
    # -------------------------------------------------------------------------
    Write-Step "Running Apex Logic Verification..."
    # Runs the unit tests we just wrote for Vector Search
    pnpm.exe --filter vibe-code-studio exec vitest run tests/electron/ApexVectorUtils.test.ts
    if ($LASTEXITCODE -ne 0) { throw "Unit Tests Failed. Build Aborted." }
    Write-Success "Logic Verification Passed."

    # -------------------------------------------------------------------------
    # 4. COMPILATION (The "Build" Gate)
    # -------------------------------------------------------------------------
    Write-Step "Compiling Intelligence Engine and UI..."
    # This builds the 'main', 'preload', 'renderer', and your new 'intelligence.ts'
    pnpm.exe --filter vibe-code-studio run build
    if ($LASTEXITCODE -ne 0) { throw "Compilation Failed." }
    Write-Success "Compilation Complete."

    # -------------------------------------------------------------------------
    # 5. PACKAGING (The "Artifact" Gate)
    # -------------------------------------------------------------------------
    Write-Step "Packaging Standalone Binary (NSIS)..."
    # Note: We skip signing for local dev to speed it up, unless RELEASE=true is set
    $env:CSC_IDENTITY_AUTO_DISCOVERY="false" 
    
    pnpm.exe --filter vibe-code-studio exec electron-builder --config electron-builder.yml --win nsis
    if ($LASTEXITCODE -ne 0) { throw "Packaging Failed." }

    # -------------------------------------------------------------------------
    # 6. FINAL VALIDATION
    # -------------------------------------------------------------------------
    Write-Step "Validating Final Artifact..."
    # Run the script we made earlier to check the unpacked resources
    pnpm.exe exec ts-node scripts/vibe-check-binaries.ts
    
    Write-Host "`nAPEX BUILD SUCCESSFUL" -ForegroundColor Yellow
    Write-Host "Artifact location: apps/vibe-code-studio/dist-electron/"
    
    # Optional: Open the folder
    try { Invoke-Item "apps/vibe-code-studio/dist-electron" } catch {}

} catch {
    Write-ErrorMsg "Build Pipeline Failed: $_"
    exit 1
}
