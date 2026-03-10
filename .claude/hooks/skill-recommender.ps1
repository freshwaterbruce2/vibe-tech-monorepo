#!/usr/bin/env powershell
# Skill Recommender - Auto-invoke relevant skills based on project and prompt intent
# Called by user-prompt-submit hook for complex tasks

param(
    [string]$Project = "workspace",
    [string]$Prompt = "",
    [string]$Intent = "task"
)

$ErrorActionPreference = "SilentlyContinue"
$SkillMappingFile = "C:\dev\.claude\skill-mapping.json"

function Get-SkillRecommendations {
    param($project, $prompt, $intent)

    if (-not (Test-Path $SkillMappingFile)) {
        return $null
    }

    try {
        $mapping = Get-Content $SkillMappingFile -Raw | ConvertFrom-Json
        $lower = $prompt.ToLower()

        $recommendations = @{
            project_skill = $null
            community_skills = @()
            global_skills = @()
            reason = ""
        }

        # Get project-specific skills
        $projectConfig = $mapping.project_skills.$project
        if ($projectConfig) {
            $recommendations.project_skill = $projectConfig.project_skill
            $recommendations.community_skills = $projectConfig.community_skills

            # Check for keyword matches
            $matchedKeywords = @()
            foreach ($keyword in $projectConfig.keywords) {
                if ($lower -match [regex]::Escape($keyword)) {
                    $matchedKeywords += $keyword
                }
            }
            if ($matchedKeywords.Count -gt 0) {
                $recommendations.reason = "Matched: $($matchedKeywords -join ', ')"
            }
        }

        # Determine intent and add global skills
        $detectedIntent = "task"

        # Check for bug/error keywords
        foreach ($keyword in $mapping.intent_keywords.bug) {
            if ($lower -match "\b$keyword\b") {
                $detectedIntent = "bug"
                break
            }
        }

        # Check for feature keywords
        if ($detectedIntent -eq "task") {
            foreach ($keyword in $mapping.intent_keywords.feature) {
                if ($lower -match "\b$keyword\b") {
                    $detectedIntent = "feature"
                    break
                }
            }
        }

        # Check for review keywords
        if ($detectedIntent -eq "task") {
            foreach ($keyword in $mapping.intent_keywords.review) {
                if ($lower -match "\b$keyword\b") {
                    $detectedIntent = "review"
                    break
                }
            }
        }

        # Add intent-based global skills
        switch ($detectedIntent) {
            "bug" { $recommendations.global_skills = $mapping.global_skills.on_bug }
            "feature" { $recommendations.global_skills = $mapping.global_skills.on_feature }
            "review" { $recommendations.global_skills = $mapping.global_skills.on_review }
            default { $recommendations.global_skills = $mapping.global_skills.always }
        }

        $recommendations.intent = $detectedIntent
        return $recommendations

    } catch {
        return $null
    }
}

function Format-SkillOutput {
    param($recommendations, $project)

    if (-not $recommendations) {
        return ""
    }

    $output = @()

    # Header
    $output += ""
    $output += "SKILL CONTEXT ($project)"
    $output += "------------------------"

    # Project skill
    if ($recommendations.project_skill) {
        $output += "  Project Skill: $($recommendations.project_skill)"
    }

    # Community skills
    if ($recommendations.community_skills -and $recommendations.community_skills.Count -gt 0) {
        $skillList = $recommendations.community_skills -join ", "
        $output += "  Tech Skills: $skillList"
    }

    # Global skills based on intent
    if ($recommendations.global_skills -and $recommendations.global_skills.Count -gt 0) {
        $globalList = $recommendations.global_skills -join ", "
        $output += "  Workflow: $globalList ($($recommendations.intent))"
    }

    # Reason if any
    if ($recommendations.reason) {
        $output += "  $($recommendations.reason)"
    }

    $output += ""

    return ($output -join "`n")
}

# Main execution
$recommendations = Get-SkillRecommendations -project $Project -prompt $Prompt -intent $Intent

if ($recommendations) {
    $output = Format-SkillOutput -recommendations $recommendations -project $Project
    Write-Host $output -ForegroundColor Cyan
}
