# Check-ShipIt.ps1
# Enforces the SHIP-IT FRAMEWORK by checking project status and tiers.

Write-Host "SHIP-IT PROTOCOL ENFORCEMENT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$shipItFile = "C:\dev\SHIP_IT_FRAMEWORK.md"

if (-not (Test-Path $shipItFile)) {
    Write-Error "SHIP_IT_FRAMEWORK.md not found!"
    exit 1
}

# Parse Tier 1 Projects from the markdown file
$lines = Get-Content $shipItFile
Write-Host "`nTIER 1: FOCUS QUEUE (SHIP IMMEDIATELY)" -ForegroundColor Yellow

foreach ($line in $lines) {
    # Match lines like: | `nova-agent` | 85% | ...
    $m = [regex]::Match($line, '|\s*`(.*?)`\s*|\s*(.*?)\s*|')
    if ($m.Success) {
        $projName = $m.Groups[1].Value.Trim()
        $status = $m.Groups[2].Value.Trim()
        
        # Skip header and separator lines
        if ($projName -ne "Project" -and $projName -notmatch "^-+$") {
            Write-Host "  - $projName" -NoNewline -ForegroundColor Green
            Write-Host " [$status]" -ForegroundColor White
        }
    }
}

Write-Host "`nTIER 3: FROZEN (DO NOT TOUCH)" -ForegroundColor Gray
Write-Host "  - invoice-automation-saas"
Write-Host "  - vibe-subscription-guard"
Write-Host "  - symptom-tracker"
Write-Host "  - monorepo-dashboard"

Write-Host "`nENFORCEMENT ACTIVE. GET TO WORK." -ForegroundColor Cyan
