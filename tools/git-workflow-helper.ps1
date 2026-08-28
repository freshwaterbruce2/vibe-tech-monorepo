# Git Workflow Helper for V:\monorepo Monorepo
# Add to your PowerShell profile: . V:\monorepo\tools\git-workflow-helper.ps1

function Show-CommitStatus {
    <#
    .SYNOPSIS
        Shows current branch status and reminds about merge workflow
    .DESCRIPTION
        Displays commits ahead of main and warns when approaching 10-commit threshold
    #>

    $currentBranch = git branch --show-current 2>$null
    if (-not $currentBranch) {
        Write-Host "❌ Not in a git repository" -ForegroundColor Red
        return
    }

    if ($currentBranch -eq "main") {
        Write-Host "✓ On main branch" -ForegroundColor Green
        return
    }

    $commitsAhead = git rev-list --count main..HEAD 2>$null
    if (-not $commitsAhead) {
        Write-Host "⚠️  Unable to determine commits ahead" -ForegroundColor Yellow
        return
    }

    Write-Host "`n📊 Git Workflow Status" -ForegroundColor Cyan
    Write-Host "  Branch: $currentBranch" -ForegroundColor White
    Write-Host "  Commits ahead of main: $commitsAhead" -ForegroundColor White

    if ($commitsAhead -eq 0) {
        Write-Host "  ✓ Up to date with main" -ForegroundColor Green
    }
    elseif ($commitsAhead -lt 7) {
        Write-Host "  ✓ On track - merge at 10 commits" -ForegroundColor Green
    }
    elseif ($commitsAhead -lt 10) {
        Write-Host "  ⚠️  Approaching 10 commits - prepare to merge" -ForegroundColor Yellow
    }
    elseif ($commitsAhead -eq 10) {
        Write-Host "  🔔 TIME TO MERGE! Run: git imerge" -ForegroundColor Magenta -BackgroundColor Black
    }
    else {
        Write-Host "  ⚠️  OVERDUE FOR MERGE! ($commitsAhead commits)" -ForegroundColor Red
        Write-Host "  Recommendation: Merge in batches of 10" -ForegroundColor Yellow
    }

    Write-Host "`n📖 Quick Commands:" -ForegroundColor Cyan
    Write-Host "  git commits-ahead  - Check count" -ForegroundColor Gray
    Write-Host "  git sync           - Pull main" -ForegroundColor Gray
    Write-Host "  git imerge         - Merge to main" -ForegroundColor Gray
    Write-Host ""
}

function Start-WorkflowMerge {
    <#
    .SYNOPSIS
        Guides through the incremental merge workflow
    .DESCRIPTION
        Interactive workflow for merging feature branch to main
    #>

    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch -eq "main") {
        Write-Host "❌ Already on main branch" -ForegroundColor Red
        return
    }

    $commitsAhead = git rev-list --count main..HEAD 2>$null

    Write-Host "`n🔄 Incremental Merge Workflow" -ForegroundColor Cyan
    Write-Host "  Branch: $currentBranch" -ForegroundColor White
    Write-Host "  Commits to merge: $commitsAhead" -ForegroundColor White
    Write-Host ""

    $confirm = Read-Host "Ready to merge to main? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "❌ Merge cancelled" -ForegroundColor Yellow
        return
    }

    Write-Host "`n📝 Step 1: Switching to main..." -ForegroundColor Cyan
    git checkout main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to switch to main" -ForegroundColor Red
        return
    }

    Write-Host "`n📥 Step 2: Pulling latest changes..." -ForegroundColor Cyan
    git pull origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to pull main" -ForegroundColor Red
        git checkout $currentBranch
        return
    }

    Write-Host "`n🔀 Step 3: Merging $currentBranch..." -ForegroundColor Cyan
    git merge $currentBranch --no-ff
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Merge conflicts detected!" -ForegroundColor Yellow
        Write-Host "  Resolve conflicts, then run:" -ForegroundColor White
        Write-Host "    git add ." -ForegroundColor Gray
        Write-Host "    git commit" -ForegroundColor Gray
        Write-Host "    git push origin main" -ForegroundColor Gray
        Write-Host "    git checkout $currentBranch" -ForegroundColor Gray
        return
    }

    Write-Host "`n📤 Step 4: Pushing to remote..." -ForegroundColor Cyan
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push to remote" -ForegroundColor Red
        return
    }

    Write-Host "`n🔙 Step 5: Returning to $currentBranch..." -ForegroundColor Cyan
    git checkout $currentBranch

    Write-Host "`n✅ Merge complete!" -ForegroundColor Green
    Write-Host "  Merged $commitsAhead commits to main" -ForegroundColor White
    Write-Host "  You can continue working on $currentBranch" -ForegroundColor White
    Write-Host ""
}

function Show-WorkflowHelp {
    <#
    .SYNOPSIS
        Displays workflow help and reminders
    #>

    Write-Host @"

┌─────────────────────────────────────────────────────────────────┐
│  V:\monorepo MONOREPO - INCREMENTAL MERGE WORKFLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DAILY WORKFLOW:                                                │
│  1. git checkout main && git pull                               │
│  2. git checkout feature/your-branch                            │
│  3. Code → Commit (keep commits small and focused)              │
│                                                                 │
│  EVERY 10 COMMITS:                                              │
│  1. Run: workflow-merge                                         │
│     OR manually:                                                │
│     git checkout main && git pull                               │
│     git merge feature/your-branch --no-ff                       │
│     git push origin main                                        │
│     git checkout feature/your-branch                            │
│                                                                 │
│  POWERSHELL FUNCTIONS:                                          │
│  - workflow-status     Check current status                     │
│  - workflow-merge      Interactive merge helper                 │
│  - workflow-help       Show this help                           │
│                                                                 │
│  GIT ALIASES:                                                   │
│  - git commits-ahead   Count commits ahead of main              │
│  - git sync            Pull main and return                     │
│  - git imerge          Auto merge to main                       │
│                                                                 │
│  WHY 10 COMMITS?                                                │
│  Small merges = 2-5 conflicts (easy)                            │
│  Large merges = 147+ conflicts (hours of work)                  │
│                                                                 │
│  📖 Full docs: V:\monorepo\MONOREPO_WORKFLOW.md                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

"@ -ForegroundColor White
}

# Aliases for easier typing
Set-Alias workflow-status Show-CommitStatus
Set-Alias workflow-merge Start-WorkflowMerge
Set-Alias workflow-help Show-WorkflowHelp
Set-Alias commits Show-CommitStatus

# Display reminder when navigating to V:\monorepo
$currentPath = Get-Location
if ($currentPath.Path -like "*V:\monorepo*") {
    Write-Host "💡 Tip: Run 'workflow-status' to check your merge status" -ForegroundColor Cyan
}

# Export functions
Export-ModuleMember -Function Show-CommitStatus, Start-WorkflowMerge, Show-WorkflowHelp
Export-ModuleMember -Alias workflow-status, workflow-merge, workflow-help, commits
