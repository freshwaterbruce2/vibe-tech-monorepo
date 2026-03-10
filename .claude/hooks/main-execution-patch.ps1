# Main execution
try {
    # Get memory system phase
    $Phase = Get-MemorySystemPhase

    # Get and update counter
    $Counter = Get-PromptCounter
    $Counter++
    Set-PromptCounter $Counter

    if (-not $PromptNumber) { $PromptNumber = $Counter }

    # Analyze the prompt
    $PromptAnalysis = Analyze-Prompt -Prompt $UserPrompt

    # Get enhanced system context
    $SystemContext = Get-EnhancedSystemContext

    # Detect current project from first modified file or working directory
    $CurrentProject = 'workspace'
    if ($SystemContext.modified_files -and $SystemContext.modified_files.Count -gt 0) {
        # Use first modified file to determine project
        $CurrentProject = Get-ProjectContext -FilePath $SystemContext.modified_files[0]
    } else {
        # Fallback to working directory
        $CurrentProject = Get-ProjectContext -FilePath $SystemContext.working_dir
    }

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
    $RecentTasks = Update-TaskHistory -Prompt $UserPrompt -Analysis $PromptAnalysis -Timestamp $SystemContext.timestamp -Project $CurrentProject

    # Planning-with-Files Suggestions (Phase 1.5)
    # Check if this task would benefit from the planning workflow
    $PlanningSuggestion = Should-SuggestPlanning -Prompt $UserPrompt -Analysis $PromptAnalysis -SystemContext $SystemContext
    if ($PlanningSuggestion.should_suggest) {
        $ActiveSession = Get-ActivePlanningSession -Project $CurrentProject
        Suggest-PlanningWorkflow -SuggestionResult $PlanningSuggestion -ActiveSession $ActiveSession -Project $CurrentProject
    }

    # OPTIMIZED: Only get agent recommendation for very complex tasks (complexity >= 5)
    # This reduces Python orchestrator calls significantly
    if ($PromptAnalysis.complexity -ge 5 -or ($PromptAnalysis.is_error -and $PromptAnalysis.complexity -ge 4)) {
        $AgentRecommendation = Get-AgentRecommendation -TaskDescription $UserPrompt -ProjectContext $CurrentProject
        if ($AgentRecommendation) {
            Invoke-SpecialistAgent -Recommendation $AgentRecommendation -Prompt $UserPrompt
        }
    }

    # Decide whether to save
    $ShouldSave = Should-SaveContext -Counter $Counter -Analysis $PromptAnalysis

    if ($ShouldSave) {
        Save-EnhancedContext -Prompt $UserPrompt -Analysis $PromptAnalysis -SystemContext $SystemContext -Counter $Counter -Phase $Phase
    }

} catch {
    # Silently fail - don't interrupt user workflow
}
