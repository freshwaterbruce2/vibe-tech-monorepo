# Phase 0 Installation Guide

**Date**: 2026-02-12
**Status**: IN PROGRESS

> Current reality note (2026-04-25): do not run the archive steps in this guide
> as written. `D:\learning-system\learning_engine.py` and
> `D:\databases\agent_learning.db` are active surfaces. Check
> `D:\databases\DB_INVENTORY.md` before moving Python files or databases.

---

## Current Status Summary

### ✅ What's Ready
- **D:\ Drive**: 681 GB free space (excellent)
- **Directory Structure**: databases/, logs/, learning-system/ exist
- **Nx Workspace**: Working (no broken builds)
- **pnpm**: 10.28.1 installed

### ❌ What's Needed
- **Ollama**: Not installed (CRITICAL - blocks Phase 1)
- **Directory Scaffolding**: New subdirectories needed
- **Python Archive**: Old learning-system code needs archiving
- **Dependencies**: npm packages for memory system

---

## Step 1: Install Ollama (REQUIRED)

### Download
1. Go to https://ollama.com
2. Click "Download" → Select "Windows"
3. Download `OllamaSetup.exe`

### Install
1. Run `OllamaSetup.exe`
2. Follow installation wizard (default options are fine)
3. Ollama will install as a Windows service
4. Service will auto-start on system boot

### Verify Installation
Open PowerShell and run:
```powershell
ollama --version
# Should output: ollama version 0.x.x
```

### Pull Embedding Model
```powershell
ollama pull nomic-embed-text
# Downloads ~274MB model
# Takes ~2-5 minutes depending on connection
```

### Test Service
```powershell
# Test if service is running
curl http://localhost:11434/api/tags

# Should return JSON with installed models
```

### Verify Model
```powershell
ollama list
# Should show:
# NAME                    ID              SIZE
# nomic-embed-text:latest xxxxxxxx        274MB
```

### Test Embedding Generation
```powershell
ollama run nomic-embed-text "test embedding"
# Should return a 768-dimensional vector
```

**Expected Time**: 10-15 minutes (including download)

---

## Step 2: Create D:\ Directory Scaffolding

Run this PowerShell script:

```powershell
# Create new subdirectories
New-Item -Path "D:\databases\_archive" -ItemType Directory -Force
New-Item -Path "D:\learning-system\embeddings" -ItemType Directory -Force
New-Item -Path "D:\learning-system\exports" -ItemType Directory -Force
New-Item -Path "D:\learning-system\consolidation" -ItemType Directory -Force
New-Item -Path "D:\learning-system\_archive" -ItemType Directory -Force
New-Item -Path "D:\logs\memory-system" -ItemType Directory -Force
New-Item -Path "D:\cache\embeddings" -ItemType Directory -Force
New-Item -Path "D:\health" -ItemType Directory -Force

Write-Host "✅ Directory scaffolding complete"
```

**Expected Time**: 1 minute

---

## Step 3: Archive Old Python Learning System

```powershell
# Move old Python code to archive
$archivePath = "D:\learning-system\_archive"

# Archive Python files
Get-ChildItem "D:\learning-system" -Filter "*.py" -File |
    Move-Item -Destination $archivePath -Force

# Archive .venv if it exists
if (Test-Path "D:\learning-system\.venv") {
    Move-Item "D:\learning-system\.venv" -Destination $archivePath -Force
}

# Archive requirements.txt, pyproject.toml, etc.
Get-ChildItem "D:\learning-system" -Include "*.txt","*.toml","*.lock" -File |
    Move-Item -Destination $archivePath -Force

Write-Host "✅ Old Python code archived to: $archivePath"
```

**Expected Time**: 2 minutes

---

## Step 4: Install npm Dependencies (After Phase 1 Package Creation)

**Note**: These will be installed AFTER we create the packages in Phase 1.

For reference, here's what will be installed:

### packages/memory dependencies:
```bash
pnpm add better-sqlite3 sqlite-vec ollama @huggingface/transformers winston zod --filter @vibetech/memory
```

### apps/memory-mcp dependencies:
```bash
pnpm add @modelcontextprotocol/sdk express zod --filter memory-mcp
```

**Expected Time**: 5 minutes

---

## Step 5: Create D:\ Snapshot (Safety)

Before making any changes, create a snapshot:

```powershell
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before memory system Phase 0" -Tag "pre-memory-system"
```

**Expected Time**: 2-5 minutes (depending on workspace size)

---

## Phase 0 Checklist

Complete these in order:

- [ ] **Install Ollama** (Step 1) - 15 min
- [ ] **Pull nomic-embed-text model** (Step 1) - 5 min
- [ ] **Test Ollama service** (Step 1) - 1 min
- [ ] **Create D:\ snapshot** (Step 5) - 5 min
- [ ] **Create directory scaffolding** (Step 2) - 1 min
- [ ] **Archive old Python code** (Step 3) - 2 min

**Total Time**: ~30 minutes

---

## Verification Script

Run this to verify Phase 0 completion:

```powershell
# Check Ollama
Write-Host "=== Checking Ollama ===" -ForegroundColor Cyan
try {
    $ollamaVersion = ollama --version
    Write-Host "✅ Ollama installed: $ollamaVersion" -ForegroundColor Green

    $models = ollama list
    if ($models -match "nomic-embed-text") {
        Write-Host "✅ nomic-embed-text model installed" -ForegroundColor Green
    } else {
        Write-Host "❌ nomic-embed-text model NOT found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Ollama not installed" -ForegroundColor Red
}

# Check D:\ directories
Write-Host "`n=== Checking D:\ Structure ===" -ForegroundColor Cyan
$requiredDirs = @(
    "D:\databases\_archive",
    "D:\learning-system\embeddings",
    "D:\learning-system\exports",
    "D:\learning-system\consolidation",
    "D:\learning-system\_archive",
    "D:\logs\memory-system",
    "D:\cache\embeddings",
    "D:\health"
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $dir" -ForegroundColor Red
    }
}

# Check disk space
Write-Host "`n=== Checking Disk Space ===" -ForegroundColor Cyan
$drive = Get-PSDrive D
$freeGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeGB -gt 10) {
    Write-Host "✅ D:\ Free Space: $freeGB GB" -ForegroundColor Green
} else {
    Write-Host "⚠️  D:\ Free Space: $freeGB GB (less than 10GB)" -ForegroundColor Yellow
}

# Check Python archive
Write-Host "`n=== Checking Python Archive ===" -ForegroundColor Cyan
$pyFiles = Get-ChildItem "D:\learning-system" -Filter "*.py" -File
if ($pyFiles.Count -eq 0) {
    Write-Host "✅ Python files archived (no .py in learning-system root)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Found $($pyFiles.Count) .py files in learning-system (not archived)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 0 Verification Complete ===" -ForegroundColor Cyan
```

Save this as `C:\dev\scripts\verify-phase-0.ps1`

---

## After Phase 0: Next Steps

Once Phase 0 is complete, you'll be ready for **Phase 1: Core Memory Infrastructure**

Phase 1 first task:
```bash
# Create packages/memory package
pnpm nx g @nx/js:library memory \
  --directory=packages/memory \
  --buildable \
  --publishable \
  --importPath=@vibetech/memory
```

---

## Troubleshooting

### Ollama won't start
- Check Windows Services: `services.msc`
- Look for "Ollama" service
- If not running: Right-click → Start
- If fails: Check Event Viewer → Windows Logs → Application

### Model download fails
```powershell
# Check internet connection
Test-NetConnection ollama.com -Port 443

# Try manual download
ollama pull nomic-embed-text --verbose
```

### Directory creation fails (permission denied)
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell icon → Run as Administrator
# Then rerun directory creation script
```

### D:\ snapshot fails
```powershell
# Check if repository exists
Test-Path "D:\repositories\vibetech"

# If not, initialize first
cd C:\dev\scripts\version-control
.\Initialize-LocalRepo.ps1
```

---

**Ready to begin? Start with Step 1: Install Ollama**

