# Pattern Search Script
# Usage: .\scripts\search-patterns.ps1 -Query "database" [-Tag "storage"]

param(
    [Parameter(Mandatory=$false)]
    [string]$Query = "",

    [Parameter(Mandatory=$false)]
    [string]$Tag = "",

    [Parameter(Mandatory=$false)]
    [switch]$ListTags = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

$PATTERNS_DIR = Join-Path $PSScriptRoot "..\.claude\patterns"
$ANTIPATTERNS_DIR = Join-Path $PSScriptRoot "..\.claude\anti-patterns"

function Show-Help {
    Write-Host @"
Pattern Search Script - Search institutional knowledge base

USAGE:
    .\scripts\search-patterns.ps1 [-Query <text>] [-Tag <tag>] [-ListTags] [-Help]

OPTIONS:
    -Query <text>     Search for text in pattern files
    -Tag <tag>        Filter by tag (e.g., #database, #git, #crypto)
    -ListTags         List all available tags
    -Help             Show this help message

EXAMPLES:
    # Search for "database" patterns
    .\scripts\search-patterns.ps1 -Query "database"

    # Search by tag
    .\scripts\search-patterns.ps1 -Tag "crypto"

    # Search with both query and tag
    .\scripts\search-patterns.ps1 -Query "nonce" -Tag "trading"

    # List all tags
    .\scripts\search-patterns.ps1 -ListTags

    # Interactive mode (no arguments)
    .\scripts\search-patterns.ps1

PATTERN CATEGORIES:
    Core Patterns:
        - database-storage.md    (D:\ storage policy, SQLite)
        - monorepo-workflow.md   (Git workflow, incremental merges)
        - nx-commands.md         (Nx caching, affected commands)
        - path-policy.md         (Path rules, validation)

    Project Patterns:
        - crypto-trading.md      (Kraken API, safety checks)
        - capacitor-mobile.md    (Android, CapacitorHttp)
        - web-applications.md    (React, shadcn/ui)
        - desktop-apps.md        (Tauri patterns)

    Anti-Patterns:
        - common-mistakes.md     (Things to avoid)

LOCATION:
    Patterns: .claude/patterns/
    Anti-patterns: .claude/anti-patterns/

"@
}

function Get-AllPatternFiles {
    $files = @()

    if (Test-Path $PATTERNS_DIR) {
        $files += Get-ChildItem -Path $PATTERNS_DIR -Recurse -Filter "*.md" -File
    }

    if (Test-Path $ANTIPATTERNS_DIR) {
        $files += Get-ChildItem -Path $ANTIPATTERNS_DIR -Recurse -Filter "*.md" -File
    }

    return $files | Where-Object { $_.Name -ne "README.md" }
}

function Extract-Tags {
    param([string]$FilePath)

    $content = Get-Content $FilePath -Raw
    if ($content -match '\*\*Tags:\*\*\s+(.+)') {
        $tagLine = $matches[1]
        $tags = $tagLine -split '\s+' | Where-Object { $_ -match '^#' } | ForEach-Object { $_.TrimStart('#') }
        return $tags
    }

    return @()
}

function List-AllTags {
    Write-Host "`nAvailable Tags:" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan

    $allTags = @{}
    $files = Get-AllPatternFiles

    foreach ($file in $files) {
        $tags = Extract-Tags -FilePath $file.FullName
        foreach ($tag in $tags) {
            if (-not $allTags.ContainsKey($tag)) {
                $allTags[$tag] = @()
            }
            $allTags[$tag] += $file.Name
        }
    }

    foreach ($tag in ($allTags.Keys | Sort-Object)) {
        $count = $allTags[$tag].Count
        Write-Host "  #$tag" -ForegroundColor Yellow -NoNewline
        Write-Host " ($count patterns)" -ForegroundColor Gray
    }

    Write-Host ""
}

function Search-Patterns {
    param(
        [string]$Query,
        [string]$Tag
    )

    $files = Get-AllPatternFiles
    $results = @()

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $tags = Extract-Tags -FilePath $file.FullName

        # Filter by tag if specified
        if ($Tag -and $tags -notcontains $Tag) {
            continue
        }

        # Filter by query if specified
        if ($Query) {
            if ($content -match $Query -or $file.Name -match $Query) {
                $results += @{
                    File = $file
                    Tags = $tags
                    Matches = ([regex]::Matches($content, $Query, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
                }
            }
        } else {
            # No query, just show all files with tag
            $results += @{
                File = $file
                Tags = $tags
                Matches = 0
            }
        }
    }

    return $results
}

function Show-SearchResults {
    param($Results, $Query, $Tag)

    if ($Results.Count -eq 0) {
        Write-Host "`nNo patterns found matching your search." -ForegroundColor Yellow
        return
    }

    Write-Host "`nFound $($Results.Count) pattern(s):" -ForegroundColor Green
    Write-Host ("=" * 60) -ForegroundColor Gray

    foreach ($result in ($Results | Sort-Object { -$_.Matches })) {
        $file = $result.File
        $tags = $result.Tags
        $matches = $result.Matches

        $relativePath = $file.FullName.Replace($PSScriptRoot + "\..\", "")

        Write-Host "`n  $($file.BaseName)" -ForegroundColor Cyan
        Write-Host "  $relativePath" -ForegroundColor Gray

        if ($tags.Count -gt 0) {
            Write-Host "  Tags: " -NoNewline -ForegroundColor Gray
            Write-Host ($tags | ForEach-Object { "#$_" }) -join ", " -ForegroundColor Yellow
        }

        if ($matches -gt 0) {
            Write-Host "  Matches: $matches" -ForegroundColor Green
        }

        # Show first few lines of pattern
        $content = Get-Content $file.FullName
        $description = $content | Where-Object { $_ -match '^##\s+Problem' } | Select-Object -First 1
        if ($description) {
            Write-Host "  $($description.TrimStart('#').Trim())" -ForegroundColor Gray
        }
    }

    Write-Host ""
}

function Interactive-Mode {
    Write-Host @"

╔══════════════════════════════════════════════╗
║   Pattern Search - Institutional Knowledge   ║
╚══════════════════════════════════════════════╝

"@

    Write-Host "What would you like to do?" -ForegroundColor Cyan
    Write-Host "  1. Search patterns by keyword"
    Write-Host "  2. Browse by tag"
    Write-Host "  3. List all tags"
    Write-Host "  4. Show all patterns"
    Write-Host "  5. Exit"
    Write-Host ""

    $choice = Read-Host "Enter choice (1-5)"

    switch ($choice) {
        "1" {
            $query = Read-Host "Enter search query"
            $results = Search-Patterns -Query $query
            Show-SearchResults -Results $results -Query $query
        }
        "2" {
            List-AllTags
            $tag = Read-Host "Enter tag name (without #)"
            $results = Search-Patterns -Tag $tag
            Show-SearchResults -Results $results -Tag $tag
        }
        "3" {
            List-AllTags
        }
        "4" {
            $results = Search-Patterns
            Show-SearchResults -Results $results
        }
        "5" {
            Write-Host "Goodbye!" -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
            Interactive-Mode
        }
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

if ($ListTags) {
    List-AllTags
    exit 0
}

if (-not $Query -and -not $Tag) {
    Interactive-Mode
} else {
    $results = Search-Patterns -Query $Query -Tag $Tag
    Show-SearchResults -Results $results -Query $Query -Tag $Tag
}