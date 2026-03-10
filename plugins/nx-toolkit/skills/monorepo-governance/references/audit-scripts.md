# Governance Audit Scripts

## Quick Audit Commands

### Check All Module Boundaries

```bash
# Run enforce-module-boundaries across all projects
pnpm nx run-many -t lint --all --parallel=5
```

### Find Projects Without Tags

```powershell
# PowerShell: Find project.json files missing tags
Get-ChildItem -Path C:\dev -Recurse -Filter "project.json" |
  Where-Object { $_.FullName -notmatch "node_modules" } |
  ForEach-Object {
    $content = Get-Content $_.FullName | ConvertFrom-Json
    if (-not $content.tags -or $content.tags.Count -eq 0) {
      Write-Warning "No tags: $($_.FullName)"
    }
  }
```

### Detect Circular Dependencies

```bash
# Visual check - look for cycles in the graph
pnpm nx graph

# Programmatic: if affected fails with cycle error, there's a problem
pnpm nx affected -t build --base=main --head=HEAD 2>&1 | grep -i "circular"
```

### Check Version Alignment

```bash
# Find all versions of a critical package across workspace
grep -r '"react":' apps/*/package.json packages/*/package.json --include="package.json" | grep -v node_modules

# Check for non-workspace protocol internal deps
grep -r '"@vibetech/' apps/*/package.json packages/*/package.json --include="package.json" | grep -v "workspace:"
```

### Find Deep Imports

```bash
# Search for imports that go deeper than the package entry point
# Pattern: from '@vibetech/package-name/src/...' or '/internal/'
grep -rn "from '@vibetech/[^']*/" apps/ packages/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "index"
```

### Find Relative Cross-Project Imports

```bash
# Search for relative imports that cross project boundaries
# Pattern: from '../../apps/' or '../../packages/'
grep -rn "from '\.\./\.\./\.\.\(apps\|packages\)" apps/ packages/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

## Full Governance Report Script

```powershell
# governance-audit.ps1 - Run all governance checks
param(
    [switch]$Fix = $false
)

Write-Host "=== Monorepo Governance Audit ===" -ForegroundColor Cyan
Write-Host ""

# 1. Module boundary check
Write-Host "[1/6] Checking module boundaries..." -ForegroundColor Yellow
$lintResult = pnpm nx run-many -t lint --all --parallel=5 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAIL: Module boundary violations found" -ForegroundColor Red
    Write-Host $lintResult | Select-String "enforce-module-boundaries"
} else {
    Write-Host "  PASS: All boundaries respected" -ForegroundColor Green
}

# 2. Tag completeness
Write-Host "[2/6] Checking project tags..." -ForegroundColor Yellow
$untagged = @()
Get-ChildItem -Path C:\dev -Recurse -Filter "project.json" |
  Where-Object { $_.FullName -notmatch "node_modules|\.nx|dist" } |
  ForEach-Object {
    $content = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if (-not $content.tags -or $content.tags.Count -eq 0) {
      $untagged += $_.FullName
    }
  }
if ($untagged.Count -gt 0) {
    Write-Host "  WARN: $($untagged.Count) projects without tags" -ForegroundColor Yellow
    $untagged | ForEach-Object { Write-Host "    - $_" }
} else {
    Write-Host "  PASS: All projects tagged" -ForegroundColor Green
}

# 3. Version alignment
Write-Host "[3/6] Checking version alignment..." -ForegroundColor Yellow
$criticalPkgs = @("react", "typescript", "vite", "eslint")
foreach ($pkg in $criticalPkgs) {
    $versions = grep -roh "`"$pkg`": `"[^`"]*`"" apps/*/package.json packages/*/package.json 2>$null |
      Sort-Object -Unique
    $count = ($versions | Measure-Object).Count
    if ($count -gt 1) {
        Write-Host "  WARN: $pkg has $count different versions" -ForegroundColor Yellow
    }
}
Write-Host "  Done checking critical packages" -ForegroundColor Green

# 4. Deep imports
Write-Host "[4/6] Checking for deep imports..." -ForegroundColor Yellow
$deepImports = grep -rn "from '@vibetech/[^']*/" apps/ packages/ --include="*.ts" --include="*.tsx" 2>$null |
  grep -v "node_modules" | grep -v "/index"
if ($deepImports) {
    Write-Host "  WARN: Deep imports found" -ForegroundColor Yellow
} else {
    Write-Host "  PASS: No deep imports" -ForegroundColor Green
}

# 5. Cross-project relative imports
Write-Host "[5/6] Checking for cross-project relative imports..." -ForegroundColor Yellow
$crossImports = grep -rn "from '\.\./\.\./\.\." apps/ packages/ --include="*.ts" --include="*.tsx" 2>$null |
  grep -v "node_modules"
if ($crossImports) {
    Write-Host "  WARN: Cross-project relative imports found" -ForegroundColor Yellow
} else {
    Write-Host "  PASS: No cross-project relative imports" -ForegroundColor Green
}

# 6. Circular dependencies
Write-Host "[6/6] Checking for circular dependencies..." -ForegroundColor Yellow
$graphCheck = pnpm nx graph --file=output.json 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARN: Graph generation issue (possible circular dep)" -ForegroundColor Yellow
} else {
    Write-Host "  PASS: Graph generated successfully" -ForegroundColor Green
    Remove-Item output.json -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Audit Complete ===" -ForegroundColor Cyan
```

## Scheduled Audit

Integrate into CI/CD (GitHub Actions):

```yaml
# .github/workflows/governance.yml
on:
  push:
    branches: [main]
jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm nx run-many -t lint --all --parallel=3
      - run: echo "Module boundary check passed"
```

Run locally before merges:

```bash
# Quick check before pushing
pnpm nx run-many -t lint --all --nx-bail
```
