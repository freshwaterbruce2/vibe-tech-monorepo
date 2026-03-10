"""Scoring algorithm for project health prioritization."""

from .models import ProjectHealth, ScanResult


def calculate_health_score(project: ProjectHealth) -> float:
    """
    Calculate health score for a project.
    
    Formula from spec:
    Score = (Staleness * 0.4) + (TODO_Count * 0.3) + (No_Tests * 0.2) + (No_README * 0.1)
    
    Higher score = needs more attention.
    
    Normalization:
    - Staleness: capped at 365 days, scaled 0-100
    - TODO_Count: capped at 50, scaled 0-100
    - No_Tests: 100 if missing, 0 if present
    - No_README: 100 if missing, 0 if present
    """
    # Normalize staleness (0-100, capped at 365 days)
    staleness_normalized = min(project.staleness_days / 365 * 100, 100)
    
    # Normalize TODO count (0-100, capped at 50 TODOs)
    todo_normalized = min(project.todo_count / 50 * 100, 100)
    
    # Boolean penalties
    no_tests_penalty = 0 if project.has_tests else 100
    no_readme_penalty = 0 if project.readme_exists else 100
    
    # Calculate weighted score
    score = (
        staleness_normalized * 0.4 +
        todo_normalized * 0.3 +
        no_tests_penalty * 0.2 +
        no_readme_penalty * 0.1
    )
    
    return round(score, 1)


def score_all_projects(result: ScanResult) -> ScanResult:
    """Calculate health scores for all projects in scan result."""
    for project in result.projects:
        project.health_score = calculate_health_score(project)
    return result
