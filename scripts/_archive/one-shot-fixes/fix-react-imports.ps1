# Fix React Import Patterns for React 19
# This script removes unused React imports and converts React.FC patterns

param(
    [string]$ProjectPath = "C:\dev\apps\vibe-code-studio",
    [switch]$DryRun = $false
)

$filesFixed = 0
$patterns = @()

Write-Host "Scanning TypeScript files in $ProjectPath..." -ForegroundColor Cyan

# Find all .tsx files
$files = Get-ChildItem -Path "$ProjectPath\src" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $changed = $false

    # Pattern 1: Remove unused default React import
    # Only if no React.* usage exists in the file
    if ($content -match "import React from 'react';?" -and
        $content -notmatch "React\.(FC|useState|useEffect|useRef|createElement|Component|Fragment|memo|forwardRef|lazy|Suspense)") {

        $content = $content -replace "import React from 'react';\r?\n", ""
        $changed = $true
        $patterns += "Removed unused React import: $($file.Name)"
    }

    # Pattern 2: Convert React.FC<Props> to typed props
    # This is more complex and requires careful replacement
    if ($content -match "React\.FC<([^>]+)>") {
        # Extract the props type
        $propsType = $matches[1]

        # Convert: export const Component: React.FC<Props> = ({ prop1, prop2 }) => {
        # To:      export const Component = ({ prop1, prop2 }: Props) => {

        $content = $content -replace `
            "export const (\w+): React\.FC<([^>]+)> = \(([^)]*)\)", `
            "export const `$1 = (`$3: `$2)"

        $content = $content -replace `
            "const (\w+): React\.FC<([^>]+)> = \(([^)]*)\)", `
            "const `$1 = (`$3: `$2)"

        $changed = $true
        $patterns += "Converted React.FC pattern: $($file.Name)"
    }

    # Pattern 3: Add type imports if needed
    if ($content -match "(MouseEvent|ChangeEvent|FormEvent|KeyboardEvent)" -and
        $content -notmatch "import.*type.*\{.*(MouseEvent|ChangeEvent|FormEvent|KeyboardEvent)") {

        # Need to add type imports
        $typeImportsNeeded = @()
        if ($content -match "MouseEvent") { $typeImportsNeeded += "MouseEvent" }
        if ($content -match "ChangeEvent") { $typeImportsNeeded += "ChangeEvent" }
        if ($content -match "FormEvent") { $typeImportsNeeded += "FormEvent" }
        if ($content -match "KeyboardEvent") { $typeImportsNeeded += "KeyboardEvent" }
        if ($content -match "ReactNode") { $typeImportsNeeded += "ReactNode" }

        $typeImports = $typeImportsNeeded -join ", "
        $importLine = "import type { $typeImports } from 'react';`n"

        # Add after existing imports
        if ($content -match "import .* from 'react';") {
            $content = $content -replace "(import .* from 'react';)", "`$1`n$importLine"
            $changed = $true
            $patterns += "Added type imports: $($file.Name)"
        }
    }

    if ($changed) {
        if (-not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "✓ Fixed: $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "Would fix: $($file.Name)" -ForegroundColor Yellow
        }
        $filesFixed++
    }
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Files analyzed: $($files.Count)"
Write-Host "Files fixed: $filesFixed"

if ($DryRun) {
    Write-Host "`nRun without -DryRun to apply changes" -ForegroundColor Yellow
}

# Show pattern breakdown
Write-Host "`nPatterns found:" -ForegroundColor Cyan
$patterns | Group-Object | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) files" -ForegroundColor Gray
}
