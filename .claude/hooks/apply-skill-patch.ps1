# Apply skill-recommender patch to user-prompt-submit.ps1
# Run this once to add skill-recommender integration

$TargetFile = "C:\dev\.claude\hooks\user-prompt-submit.ps1"
$BackupFile = "C:\dev\.claude\hooks\user-prompt-submit.ps1.pre-patch"

# Read current content
$Content = Get-Content $TargetFile -Raw

# Check if already patched
if ($Content -match "Skill Recommender Integration") {
    Write-Host "Already patched! Skill Recommender Integration found." -ForegroundColor Green
    exit 0
}

# Backup
Copy-Item $TargetFile $BackupFile -Force
Write-Host "Backup created: $BackupFile" -ForegroundColor Cyan

# Find and replace the section
$OldBlock = @'
    # Update task history (runs every time to keep task state current)
    $RecentTasks = Update-TaskHistory
'@

$NewBlock = @'
    # ============================================================================
    # Skill Recommender Integration (Phase 1.6)
    # Suggests relevant skills based on project and prompt keywords
    # ============================================================================
    if ($PromptAnalysis.is_task -or $PromptAnalysis.is_error -or $PromptAnalysis.complexity -ge 3) {
        $SkillRecommenderPath = "C:\dev\.claude\hooks\skill-recommender.ps1"
        if (Test-Path $SkillRecommenderPath) {
            try {
                & $SkillRecommenderPath -Project $CurrentProject -Prompt $UserPrompt -Intent $PromptAnalysis.category
            } catch {
                # Silently continue if skill recommender fails
            }
        }
    }

    # Update task history (runs every time to keep task state current)
    $RecentTasks = Update-TaskHistory
'@

$NewContent = $Content -replace [regex]::Escape($OldBlock), $NewBlock

if ($NewContent -eq $Content) {
    Write-Host "Pattern not found - manual patch may be needed" -ForegroundColor Yellow
    Write-Host "Add skill-recommender call before '# Update task history' line" -ForegroundColor Yellow
} else {
    Set-Content $TargetFile $NewContent -Encoding UTF8
    Write-Host "Patch applied successfully!" -ForegroundColor Green
    Write-Host "Skill recommender will now run for tasks with complexity >= 3" -ForegroundColor Cyan
}
