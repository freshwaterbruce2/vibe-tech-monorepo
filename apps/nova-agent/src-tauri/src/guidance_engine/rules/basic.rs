use super::GuidanceRule;
use crate::guidance_engine::types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
};
use crate::guidance_engine::utils::timestamp_now;

/// Rule: Check git status for uncommitted changes
pub(super) struct GitStatusRule;

impl GuidanceRule for GitStatusRule {
    fn name(&self) -> &str {
        "git_status"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        if let Some(git) = &input.context.git_status {
            // Check for many uncommitted changes
            let total_changes = git.modified_files.len() + git.staged_files.len();

            if total_changes > 10 {
                items.push(GuidanceItem {
                    id: format!("git-many-changes-{}", now),
                    category: GuidanceCategory::AtRisk,
                    priority: GuidancePriority::High,
                    title: "Large uncommitted changeset".to_string(),
                    description: format!(
                        "You have {} uncommitted changes. Consider breaking this into smaller commits.",
                        total_changes
                    ),
                    action: Some(GuidanceAction {
                        action_type: "run_command".to_string(),
                        payload: serde_json::json!({ "command": "git status" }),
                    }),
                    created_at: now,
                });
            } else if !git.staged_files.is_empty() {
                items.push(GuidanceItem {
                    id: format!("git-staged-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Staged changes ready to commit".to_string(),
                    description: format!(
                        "{} files staged. Ready to commit when you're done.",
                        git.staged_files.len()
                    ),
                    action: Some(GuidanceAction {
                        action_type: "run_command".to_string(),
                        payload: serde_json::json!({ "command": "git commit" }),
                    }),
                    created_at: now,
                });
            }

            // Check if behind remote
            if git.behind > 0 {
                items.push(GuidanceItem {
                    id: format!("git-behind-{}", now),
                    category: GuidanceCategory::AtRisk,
                    priority: GuidancePriority::Medium,
                    title: "Branch is behind remote".to_string(),
                    description: format!(
                        "Your branch is {} commits behind. Consider pulling to avoid merge conflicts.",
                        git.behind
                    ),
                    action: Some(GuidanceAction {
                        action_type: "run_command".to_string(),
                        payload: serde_json::json!({ "command": "git pull" }),
                    }),
                    created_at: now,
                });
            }

            // Positive: Clean working directory
            if total_changes == 0 && git.ahead > 0 {
                items.push(GuidanceItem {
                    id: format!("git-clean-{}", now),
                    category: GuidanceCategory::DoingRight,
                    priority: GuidancePriority::Low,
                    title: "Clean working directory".to_string(),
                    description: format!(
                        "All changes committed. {} commits ready to push.",
                        git.ahead
                    ),
                    action: None,
                    created_at: now,
                });
            }
        }

        items
    }
}

/// Rule: Check task progress
pub(super) struct TaskProgressRule;

impl GuidanceRule for TaskProgressRule {
    fn name(&self) -> &str {
        "task_progress"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        let in_progress: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "in_progress" || t.status == "in-progress")
            .collect();

        let pending: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| {
                t.status == "pending" || t.status == "not_started" || t.status == "not-started"
            })
            .collect();

        // Too many in-progress tasks
        if in_progress.len() > 3 {
            items.push(GuidanceItem {
                id: format!("tasks-too-many-{}", now),
                category: GuidanceCategory::AtRisk,
                priority: GuidancePriority::High,
                title: "Too many tasks in progress".to_string(),
                description: format!(
                    "You have {} tasks in progress. Focus on completing some before starting new ones.",
                    in_progress.len()
                ),
                action: None,
                created_at: now,
            });
        }

        // Suggest next task
        if in_progress.is_empty() && !pending.is_empty() {
            if let Some(next) = pending.first() {
                items.push(GuidanceItem {
                    id: format!("tasks-suggest-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Start next task".to_string(),
                    description: format!("Ready to start: {}", next.title),
                    action: Some(GuidanceAction {
                        action_type: "start_task".to_string(),
                        payload: serde_json::json!({ "task_id": next.id }),
                    }),
                    created_at: now,
                });
            }
        }

        // Positive: Tasks being completed
        let completed_today: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "completed" || t.status == "done")
            .collect();

        if !completed_today.is_empty() {
            items.push(GuidanceItem {
                id: format!("tasks-progress-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Low,
                title: "Making progress".to_string(),
                description: format!(
                    "{} tasks completed. Keep up the good work!",
                    completed_today.len()
                ),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Encourage deep work sessions
pub(super) struct DeepWorkRule;

impl GuidanceRule for DeepWorkRule {
    fn name(&self) -> &str {
        "deep_work"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();
        let deep_work_mins = input.context.deep_work_minutes;

        // Celebrate deep work milestones
        if deep_work_mins >= 90 {
            items.push(GuidanceItem {
                id: format!("deepwork-90-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Medium,
                title: "Deep work session achieved".to_string(),
                description: format!(
                    "{}+ minutes of focused work! Consider taking a short break.",
                    deep_work_mins
                ),
                action: None,
                created_at: now,
            });
        } else if deep_work_mins >= 45 {
            items.push(GuidanceItem {
                id: format!("deepwork-45-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Low,
                title: "Good focus session".to_string(),
                description: format!("{} minutes of focused work. Keep going!", deep_work_mins),
                action: None,
                created_at: now,
            });
        }

        // Suggest break if working too long
        if deep_work_mins >= 120 {
            items.push(GuidanceItem {
                id: format!("deepwork-break-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Medium,
                title: "Time for a break".to_string(),
                description:
                    "You've been working for 2+ hours. A short break helps maintain productivity."
                        .to_string(),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Check commit message hygiene
pub(super) struct CommitHygieneRule;

impl GuidanceRule for CommitHygieneRule {
    fn name(&self) -> &str {
        "commit_hygiene"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Check learning events for commit-related patterns
        let bad_commits: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| e.event_type == "bad_commit" || e.outcome.as_deref() == Some("failure"))
            .take(3)
            .collect();

        if !bad_commits.is_empty() {
            items.push(GuidanceItem {
                id: format!("commit-hygiene-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Low,
                title: "Review commit practices".to_string(),
                description:
                    "Some recent commits had issues. Consider using conventional commit format."
                        .to_string(),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Analyze activity patterns
pub(super) struct ActivityPatternRule;

impl GuidanceRule for ActivityPatternRule {
    fn name(&self) -> &str {
        "activity_patterns"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Check for context switching (many different activity types)
        let activity_types: std::collections::HashSet<_> = input
            .recent_activities
            .iter()
            .map(|a| &a.activity_type)
            .collect();

        if activity_types.len() > 5 && input.recent_activities.len() > 10 {
            items.push(GuidanceItem {
                id: format!("activity-switching-{}", now),
                category: GuidanceCategory::AtRisk,
                priority: GuidancePriority::Medium,
                title: "High context switching".to_string(),
                description: "You've been switching between many different activities. Try to batch similar work.".to_string(),
                action: None,
                created_at: now,
            });
        }

        // Positive: Consistent focus
        if activity_types.len() <= 2 && input.recent_activities.len() >= 5 {
            items.push(GuidanceItem {
                id: format!("activity-focus-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Low,
                title: "Good focus".to_string(),
                description: "You're staying focused on a consistent set of activities."
                    .to_string(),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context_engine::{GitStatus, SystemContext};

    #[test]
    fn test_git_status_rule() {
        let rule = GitStatusRule;
        let input = GuidanceInput {
            context: SystemContext {
                timestamp: 0,
                workspace_root: "C:\\dev".to_string(),
                git_status: Some(GitStatus {
                    branch: "main".to_string(),
                    modified_files: vec!["file1.rs".to_string(); 15],
                    staged_files: vec![],
                    behind: 0,
                    ahead: 0,
                }),
                active_processes: vec![],
                current_project: None,
                recent_files: vec![],
                deep_work_minutes: 0,
            },
            tasks: vec![],
            recent_activities: vec![],
            learning_events: vec![],
        };

        let items = rule.evaluate(&input);
        assert!(items.iter().any(|i| i.category == GuidanceCategory::AtRisk));
    }
}
