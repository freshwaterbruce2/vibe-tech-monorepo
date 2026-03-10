# Learning System WhatsApp Commands
# To be called from OpenClaw/Clawdbot when user sends /learning-* commands

Import-Module C:\dev\scripts\LearningSystem.psm1

function Invoke-LearningCommand {
    <#
    .SYNOPSIS
    Handle WhatsApp /learning-* commands
    
    .PARAMETER Command
    Command name: mistakes, successes, recommend, stats
    
    .PARAMETER Args
    Additional arguments
    #>
    param(
        [string]$Command,
        [string[]]$Args = @()
    )
    
    switch ($Command) {
        'mistakes' {
            $limit = if ($Args[0]) { [int]$Args[0] } else { 10 }
            Get-LearningMistakes -Last $limit
        }
        
        'successes' {
            $limit = if ($Args[0]) { [int]$Args[0] } else { 10 }
            Get-LearningSuccesses -Last $limit
        }
        
        'recommend' {
            if (-not $Args[0]) {
                Write-Host "Usage: /learning-recommend <task-type>" -ForegroundColor Yellow
                return
            }
            $taskType = $Args -join ' '
            Get-LearningRecommendations -TaskType $taskType
        }
        
        'stats' {
            Show-LearningStats
        }
        
        default {
            Write-Host @"
📚 Learning System Commands:

/learning-mistakes [N] - Show last N mistakes (default: 10)
/learning-successes [N] - Show last N successes (default: 10)
/learning-recommend <task> - Get recommendations for a task
/learning-stats - Show overall statistics

Examples:
  /learning-mistakes 5
  /learning-successes
  /learning-recommend TypeScript build
  /learning-stats
"@ -ForegroundColor Cyan
        }
    }
}

# Export for use in skills
Export-ModuleMember -Function Invoke-LearningCommand
