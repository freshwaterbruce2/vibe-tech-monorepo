# Analyze-GeminiIndexing.ps1
# Analyzes which files Gemini would index based on VS Code settings

param(
    [switch]$Detailed,
    [switch]$ExportCsv,
    [string]$OutputPath = "C:\dev\gemini-indexing-report.csv"
)

Write-Host "Analyzing Gemini Indexing for C:\dev..." -ForegroundColor Cyan
Write-Host ""

# Exclusion patterns (from recommended settings)
$excludePatterns = @(
    '**/node_modules/**',
    '**/.nx/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/.cache/**',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/*.tsbuildinfo',
    '**/pnpm-lock.yaml',
    '**/.git/**',
    'D:/databases/**',
    'D:/logs/**',
    'D:/data/**',
    'D:/repositories/**'
)

# Include patterns (files Gemini should index)
$includeExtensions = @('.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json')

# Convert glob patterns to regex
function Convert-GlobToRegex {
    param([string]$Pattern)

    $regex = $Pattern `
        -replace '/', '\\' `
        -replace '\*\*', '.*' `
        -replace '\*', '[^\\]*' `
        -replace '\.', '\.'

    return $regex
}

# Check if file should be excluded
function Test-ShouldExclude {
    param([string]$Path)

    foreach ($pattern in $excludePatterns) {
        $regex = Convert-GlobToRegex $pattern
        if ($Path -match $regex) {
            return $true
        }
    }
    return $false
}

# Check if file should be included by extension
function Test-ShouldInclude {
    param([string]$Path)

    $ext = [System.IO.Path]::GetExtension($Path).ToLower()
    return $includeExtensions -contains $ext
}

Write-Host "Scanning C:\dev directory..." -ForegroundColor Yellow

# Get all files
$allFiles = Get-ChildItem -Path "C:\dev" -File -Recurse -ErrorAction SilentlyContinue

# Statistics
$stats = @{
    TotalFiles = 0
    IndexedFiles = 0
    ExcludedFiles = 0
    TotalSize = 0
    IndexedSize = 0
    ExcludedSize = 0
    FilesByType = @{}
    ExcludedByPattern = @{}
}

$indexedFiles = @()

Write-Host "Analyzing files..." -ForegroundColor Yellow

foreach ($file in $allFiles) {
    $stats.TotalFiles++
    $stats.TotalSize += $file.Length

    $relativePath = $file.FullName.Replace("C:\dev\", "")

    # Check exclusions
    if (Test-ShouldExclude $file.FullName) {
        $stats.ExcludedFiles++
        $stats.ExcludedSize += $file.Length

        # Track which pattern excluded it
        foreach ($pattern in $excludePatterns) {
            $regex = Convert-GlobToRegex $pattern
            if ($file.FullName -match $regex) {
                if (-not $stats.ExcludedByPattern.ContainsKey($pattern)) {
                    $stats.ExcludedByPattern[$pattern] = 0
                }
                $stats.ExcludedByPattern[$pattern]++
                break
            }
        }
        continue
    }

    # Check if should be indexed by extension
    if (Test-ShouldInclude $file.FullName) {
        $stats.IndexedFiles++
        $stats.IndexedSize += $file.Length

        $ext = $file.Extension.ToLower()
        if (-not $stats.FilesByType.ContainsKey($ext)) {
            $stats.FilesByType[$ext] = @{Count = 0; Size = 0}
        }
        $stats.FilesByType[$ext].Count++
        $stats.FilesByType[$ext].Size += $file.Length

        $indexedFiles += [PSCustomObject]@{
            Path = $relativePath
            Extension = $ext
            Size = $file.Length
            LastModified = $file.LastWriteTime
        }
    }
}

# Display results
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "GEMINI INDEXING ANALYSIS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "OVERALL STATISTICS" -ForegroundColor Cyan
Write-Host "------------------"
Write-Host "Total Files Scanned:    $($stats.TotalFiles.ToString('N0'))"
Write-Host "Files to Index:         $($stats.IndexedFiles.ToString('N0')) " -NoNewline
if ($stats.IndexedFiles -gt 10000) {
    Write-Host "⚠️ TOO MANY!" -ForegroundColor Red
} else {
    Write-Host "✅ Good" -ForegroundColor Green
}
Write-Host "Files Excluded:         $($stats.ExcludedFiles.ToString('N0'))"
Write-Host ""
Write-Host "Total Size:             $([math]::Round($stats.TotalSize / 1GB, 2)) GB"
Write-Host "Indexed Size:           $([math]::Round($stats.IndexedSize / 1MB, 2)) MB " -NoNewline
if ($stats.IndexedSize -gt 500MB) {
    Write-Host "⚠️ Large!" -ForegroundColor Yellow
} else {
    Write-Host "✅ Good" -ForegroundColor Green
}
Write-Host "Excluded Size:          $([math]::Round($stats.ExcludedSize / 1GB, 2)) GB"
Write-Host ""

Write-Host "FILES TO INDEX BY TYPE" -ForegroundColor Cyan
Write-Host "----------------------"
$stats.FilesByType.GetEnumerator() | Sort-Object {$_.Value.Count} -Descending | ForEach-Object {
    $ext = $_.Key
    $count = $_.Value.Count
    $size = [math]::Round($_.Value.Size / 1MB, 2)
    Write-Host "$ext : $count files ($size MB)"
}
Write-Host ""

Write-Host "TOP EXCLUSION PATTERNS" -ForegroundColor Cyan
Write-Host "----------------------"
$stats.ExcludedByPattern.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "$($_.Key): $($_.Value.ToString('N0')) files"
}
Write-Host ""

# Warnings
Write-Host "RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "---------------"

if ($stats.IndexedFiles -gt 10000) {
    Write-Host "⚠️  Indexed file count is high (>10k). Consider:" -ForegroundColor Red
    Write-Host "   - Adding more exclusions to .vscode/settings.json"
    Write-Host "   - Checking if large projects are being indexed unnecessarily"
}

if ($stats.IndexedSize -gt 500MB) {
    Write-Host "⚠️  Indexed size is large (>500MB). Consider:" -ForegroundColor Yellow
    Write-Host "   - Setting gemini.workspace.maxFileSize to 512KB"
    Write-Host "   - Excluding large documentation or data files"
}

if ($stats.IndexedFiles -lt 5000) {
    Write-Host "✅ File count looks good (<5k files)" -ForegroundColor Green
}

if ($stats.IndexedSize -lt 200MB) {
    Write-Host "✅ Indexed size looks good (<200MB)" -ForegroundColor Green
}

Write-Host ""

# Detailed output
if ($Detailed) {
    Write-Host "LARGEST INDEXED FILES (Top 20)" -ForegroundColor Cyan
    Write-Host "------------------------------"
    $indexedFiles | Sort-Object Size -Descending | Select-Object -First 20 | ForEach-Object {
        $sizeMB = [math]::Round($_.Size / 1MB, 2)
        Write-Host "$($_.Path) - $sizeMB MB" -ForegroundColor Gray
    }
    Write-Host ""
}

# Export CSV
if ($ExportCsv) {
    $indexedFiles | Export-Csv -Path $OutputPath -NoTypeInformation
    Write-Host "✅ Exported detailed report to: $OutputPath" -ForegroundColor Green
    Write-Host ""
}

# Suggestions
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "----------"
Write-Host "1. Review .vscode/settings.json exclusions"
Write-Host "2. Reload VS Code window (Ctrl+Shift+P → 'Reload Window')"
Write-Host "3. Check Gemini indexing status in VS Code"
Write-Host "4. Run this script again to verify improvements"
Write-Host ""
Write-Host "For detailed file list, run:" -ForegroundColor Yellow
Write-Host "  .\Analyze-GeminiIndexing.ps1 -Detailed -ExportCsv" -ForegroundColor White
Write-Host ""
