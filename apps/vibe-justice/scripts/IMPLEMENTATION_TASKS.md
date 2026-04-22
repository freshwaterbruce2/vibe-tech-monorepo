```powershell
# Run backend pytest tests locally
param(
    [switch]$Coverage,      # Generate coverage report
    [switch]$Unit,          # Run only unit tests
    [switch]$Integration,   # Run only integration tests
    [switch]$Verbose        # Verbose output
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Backend Tests" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Navigate to backend
Push-Location "$PSScriptRoot\..\backend"

try {
    # Activate venv
    Write-Host "`nActivating virtual environment..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1
    
    # Build pytest command
    $pytestCmd = "pytest"
    
    if ($Unit) {
        $pytestCmd += " -m unit"
    } elseif ($Integration) {
        $pytestCmd += " -m integration"
    }
    
    if ($Coverage) {
        $pytestCmd += " --cov=vibe_justice --cov-report=html --cov-report=term"
    }
    
    if ($Verbose) {
        $pytestCmd += " -vv"
    }
    
    # Run tests
    Write-Host "`nRunning tests..." -ForegroundColor Yellow
    Write-Host "Command: $pytestCmd`n" -ForegroundColor Gray
    
    Invoke-Expression $pytestCmd
    
    # Check result
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ All tests passed!" -ForegroundColor Green
        
        if ($Coverage) {
            Write-Host "`nCoverage report: backend\htmlcov\index.html" -ForegroundColor Cyan
            Start-Process "htmlcov\index.html"
        }
        exit 0
    } else {
        Write-Host "`n❌ Tests failed!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
```

### 9.2 Frontend Test Runner

**File:** `scripts/run-frontend-tests.ps1`

```powershell
# Run frontend Playwright E2E tests locally
param(
    [switch]$UI,        # Run with UI mode (headed browser)
    [switch]$Debug,     # Run in debug mode
    [string]$Test       # Run specific test file
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Frontend E2E Tests" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Navigate to frontend
Push-Location "$PSScriptRoot\..\frontend"

try {
    # Build Playwright command
    $playwrightCmd = "pnpm exec playwright test"
    
    if ($UI) {
        $playwrightCmd += " --ui"
    } elseif ($Debug) {
        $playwrightCmd += " --debug"
    }
    
    if ($Test) {
        $playwrightCmd += " $Test"
    }
    
    # Run tests
    Write-Host "`nRunning E2E tests..." -ForegroundColor Yellow
    Write-Host "Command: $playwrightCmd`n" -ForegroundColor Gray
    
    Invoke-Expression $playwrightCmd
    
    # Check result
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ All E2E tests passed!" -ForegroundColor Green
        Write-Host "`nTest report: frontend\playwright-report\index.html" -ForegroundColor Cyan
        Start-Process "playwright-report\index.html"
        exit 0
    } else {
        Write-Host "`n❌ E2E tests failed!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
```

### 9.3 Complete Test Suite Runner

**File:** `scripts/run-all-tests.ps1`

```powershell
# Run all tests (backend + frontend) locally
param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$Coverage
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Complete Test Suite" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$startTime = Get-Date
$failedTests = @()

# Backend tests
if (-not $SkipBackend) {
    Write-Host "`n[1/2] Running backend tests..." -ForegroundColor Yellow
    
    $backendArgs = @()
    if ($Coverage) { $backendArgs += "-Coverage" }
    
    & "$PSScriptRoot\run-backend-tests.ps1" @backendArgs
    
    if ($LASTEXITCODE -ne 0) {
        $failedTests += "Backend"
    }
}

# Frontend tests
if (-not $SkipFrontend) {
    Write-Host "`n[2/2] Running frontend tests..." -ForegroundColor Yellow
    
    & "$PSScriptRoot\run-frontend-tests.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        $failedTests += "Frontend"
    }
}

# Summary
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Duration: $($duration.ToString('mm\:ss'))" -ForegroundColor Gray

if ($failedTests.Count -eq 0) {
    Write-Host "✅ All test suites passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Failed test suites: $($failedTests -join ', ')" -ForegroundColor Red
    exit 1
}
```

### 9.4 Release Build Script

**File:** `scripts/build-release.ps1`

```powershell
# Build production release locally
param(
    [switch]$SkipTests  # Skip tests before building
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Release Build" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$startTime = Get-Date

# Step 1: Run tests
if (-not $SkipTests) {
    Write-Host "`n[1/4] Running test suite..." -ForegroundColor Yellow
    & "$PSScriptRoot\run-all-tests.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Tests failed! Build aborted." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n⚠️  Skipping tests (use with caution!)" -ForegroundColor Yellow
}

# Step 2: Build frontend
Write-Host "`n[2/4] Building frontend..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
pnpm run build
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Build Electron app
Write-Host "`n[3/4] Building Electron app..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
pnpm run electron:build
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Electron build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Verify output
Write-Host "`n[4/4] Verifying build output..." -ForegroundColor Yellow
$installerPath = Get-ChildItem -Path "$PSScriptRoot\..\frontend\release" -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($installerPath) {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    Write-Host "`nInstaller: $($installerPath.FullName)" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($installerPath.Length / 1MB, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "`n❌ Installer not found!" -ForegroundColor Red
    exit 1
}

$endTime = Get-Date
$duration = $endTime - $startTime
Write-Host "`nBuild completed in $($duration.ToString('mm\:ss'))" -ForegroundColor Gray
```

### 9.5 Data Backup Script

**File:** `scripts/backup-data.ps1`

```powershell
# Backup vibe-justice data locally
param(
    [int]$RetentionDays = 30  # Keep backups for 30 days
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Vibe-Justice Data Backup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$sourceData = "D:\learning-system\vibe-justice"
$backupRoot = "D:\backups\vibe-justice"
$backupDest = "$backupRoot\vibe-justice_$timestamp"

# Verify source exists
if (-not (Test-Path $sourceData)) {
    Write-Host "❌ Source data directory not found: $sourceData" -ForegroundColor Red
    exit 1
}

# Create backup directory
Write-Host "`nCreating backup: $backupDest" -ForegroundColor Yellow
New-Item -Path $backupDest -ItemType Directory -Force | Out-Null

# Backup data
Write-Host "Backing up data..." -ForegroundColor Yellow
Copy-Item -Path "$sourceData\*" -Destination $backupDest -Recurse -Force

# Compress
Write-Host "Compressing backup..." -ForegroundColor Yellow
Compress-Archive -Path $backupDest -DestinationPath "$backupDest.zip" -Force
Remove-Item -Path $backupDest -Recurse -Force

# Cleanup old backups
Write-Host "`nCleaning up old backups (>$RetentionDays days)..." -ForegroundColor Yellow
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem "$backupRoot\vibe-justice_*.zip" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoffDate } |
    ForEach-Object {
        Write-Host "  Deleting: $($_.Name)" -ForegroundColor Gray
        Remove-Item $_.FullName -Force
    }

# Summary
$backupSize = (Get-Item "$backupDest.zip").Length / 1MB
Write-Host "`n✅ Backup complete!" -ForegroundColor Green
Write-Host "Location: $backupDest.zip" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($backupSize, 2)) MB" -ForegroundColor Gray
```

---

## TASK 10: Documentation (1 hour)

### 10.1 Testing Guide

**File:** `TESTING_GUIDE.md`
(Content already created - verify and commit)

### 10.2 Local Automation Guide

**File:** `LOCAL_AUTOMATION.md`
(Content already created - verify and commit)

---

## TASK 11: Create Test Fixtures (15 min)

### 11.1 Sample PDF

**File:** `backend/tests/fixtures/sample.pdf`
Create a minimal test PDF file with basic text content.

### 11.2 Sample JSON

**File:** `backend/tests/fixtures/test_case_metadata.json`

```json
{
  "case_id": "FIXTURE-001",
  "jurisdiction": "SC",
  "case_type": "civil",
  "title": "Sample Test Case",
  "created_at": "2026-01-01T00:00:00+00:00"
}
```

---

## TASK 12: Install Test Dependencies (15 min)

### 12.1 Backend Dependencies

```bash
cd backend
.\.venv\Scripts\Activate.ps1
pip install pytest pytest-cov httpx
```

### 12.2 Frontend Dependencies

```bash
cd frontend
pnpm add -D @playwright/test
pnpm exec playwright install
```

---

## TASK 13: Verification & Testing (30 min)

### 13.1 Run Backend Tests

```powershell
.\scripts\run-backend-tests.ps1 -Coverage -Verbose
```

**Expected Result:**

- All tests pass
- Coverage report generated
- Coverage >= 80%

### 13.2 Run Frontend Tests

```powershell
.\scripts\run-frontend-tests.ps1
```

**Expected Result:**

- All E2E tests pass
- Test report generated
- No browser crashes

### 13.3 Run Complete Suite

```powershell
.\scripts\run-all-tests.ps1 -Coverage
```

**Expected Result:**

- Both backend and frontend tests pass
- Reports generated
- Summary shows 0 failures

---

## SUCCESS CRITERIA

Phase 3 is complete when:

- [x] Backend test directory structure created
- [x] pytest configured with coverage
- [x] Unit tests written (auth, paths, file service, timestamps)
- [x] Integration tests written (API endpoints)
- [x] Frontend Playwright tests written (case workflow, settings, error handling)
- [x] All PowerShell automation scripts created
- [x] Documentation complete (TESTING_GUIDE.md, LOCAL_AUTOMATION.md)
- [x] All tests pass locally
- [x] Coverage >= 80%

---

## EXECUTION NOTES

1. **File Paths:** Use absolute paths for D: drive, ensure directories exist
2. **Dependencies:** Install pytest, pytest-cov, httpx, @playwright/test
3. **Environment:** All tests run in temp directories (no production data affected)
4. **Coverage:** Target 80% minimum, focus on critical paths
5. **Local Only:** No GitHub, no CI/CD, everything runs locally on Windows 11

---

**End of Implementation Plan**
