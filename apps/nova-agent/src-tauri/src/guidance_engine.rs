//! Guidance Engine for Nova Agent
//!
//! Analyzes context (tasks, git status, activity) to generate personalized guidance:
//! - NextSteps: Suggested actions based on current state
//! - DoingRight: Positive reinforcement for good practices
//! - AtRisk: Warnings about potential issues

use crate::context_engine::SystemContext;
use crate::database::{Activity, LearningEvent, Task};
use chrono::Timelike; // For hour() method
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

/// A single guidance item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceItem {
    pub id: String,
    pub category: GuidanceCategory,
    pub priority: GuidancePriority,
    pub title: String,
    pub description: String,
    pub action: Option<GuidanceAction>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GuidanceCategory {
    NextSteps,
    DoingRight,
    AtRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum GuidancePriority {
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// Action that can be taken for a guidance item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceAction {
    pub action_type: String, // "open_file", "run_command", "create_task", etc.
    pub payload: serde_json::Value,
}

/// Complete guidance response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceResponse {
    pub next_steps: Vec<GuidanceItem>,
    pub doing_right: Vec<GuidanceItem>,
    pub at_risk: Vec<GuidanceItem>,
    pub generated_at: u64,
    pub context_summary: String,
}

/// Input for guidance generation
#[derive(Debug, Clone)]
pub struct GuidanceInput {
    pub context: SystemContext,
    pub tasks: Vec<Task>,
    pub recent_activities: Vec<Activity>,
    pub learning_events: Vec<LearningEvent>,
}

pub struct GuidanceEngine {
    rules: Vec<Box<dyn GuidanceRule + Send + Sync>>,
}

impl GuidanceEngine {
    pub fn new() -> Self {
        let mut engine = Self { rules: Vec::new() };

        // Register built-in rules
        engine.register_rule(Box::new(GitStatusRule));
        engine.register_rule(Box::new(TaskProgressRule));
        engine.register_rule(Box::new(DeepWorkRule));
        engine.register_rule(Box::new(CommitHygieneRule));
        engine.register_rule(Box::new(ActivityPatternRule));
        
        // Register Phase 1 enhanced rules (2026-01-16)
        engine.register_rule(Box::new(PerformanceRule));
        engine.register_rule(Box::new(SecurityRule));
        engine.register_rule(Box::new(DependencyRule));
        engine.register_rule(Box::new(PredictiveRule));

        info!(
            "GuidanceEngine initialized with {} rules",
            engine.rules.len()
        );
        engine
    }

    pub fn register_rule(&mut self, rule: Box<dyn GuidanceRule + Send + Sync>) {
        self.rules.push(rule);
    }

    /// Generate guidance based on current context
    pub fn generate(&self, input: &GuidanceInput) -> GuidanceResponse {
        debug!("Generating guidance from {} rules", self.rules.len());

        let mut next_steps = Vec::new();
        let mut doing_right = Vec::new();
        let mut at_risk = Vec::new();

        for rule in &self.rules {
            let items = rule.evaluate(input);
            for item in items {
                match item.category {
                    GuidanceCategory::NextSteps => next_steps.push(item),
                    GuidanceCategory::DoingRight => doing_right.push(item),
                    GuidanceCategory::AtRisk => at_risk.push(item),
                }
            }
        }

        // Sort by priority (highest first)
        next_steps.sort_by(|a, b| b.priority.cmp(&a.priority));
        at_risk.sort_by(|a, b| b.priority.cmp(&a.priority));

        let context_summary = self.summarize_context(input);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        GuidanceResponse {
            next_steps,
            doing_right,
            at_risk,
            generated_at: now,
            context_summary,
        }
    }

    fn summarize_context(&self, input: &GuidanceInput) -> String {
        let mut parts = Vec::new();

        if let Some(project) = &input.context.current_project {
            parts.push(format!(
                "Project: {} ({})",
                project.name, project.project_type
            ));
        }

        if let Some(git) = &input.context.git_status {
            parts.push(format!("Branch: {}", git.branch));
            if !git.modified_files.is_empty() {
                parts.push(format!("{} modified files", git.modified_files.len()));
            }
        }

        let in_progress = input
            .tasks
            .iter()
            .filter(|t| t.status == "in_progress")
            .count();
        if in_progress > 0 {
            parts.push(format!("{} tasks in progress", in_progress));
        }

        parts.push(format!("{} min deep work", input.context.deep_work_minutes));

        parts.join(" | ")
    }
}

impl Default for GuidanceEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Trait for guidance rules
pub trait GuidanceRule {
    #[allow(dead_code)]
    fn name(&self) -> &str;
    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem>;
}

// ============================================
// Built-in Rules
// ============================================

/// Rule: Check git status for uncommitted changes
struct GitStatusRule;

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
struct TaskProgressRule;

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
struct DeepWorkRule;

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
struct CommitHygieneRule;

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
struct ActivityPatternRule;

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

// ============================================
// Phase 1 Enhanced Rules (2026-01-16)
// ============================================

/// Rule: Performance optimization - detects slow builds, failing tests
struct PerformanceRule;

impl GuidanceRule for PerformanceRule {
    fn name(&self) -> &str {
        "performance"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Check learning events for slow build patterns
        let slow_builds: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| {
                e.event_type == "build_completed"
                    && parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("duration_seconds").and_then(|d| d.as_u64()))
                        .map(|d| d > 30)
                        .unwrap_or(false)
            })
            .collect();

        if !slow_builds.is_empty() {
            let avg_duration: u64 = slow_builds
                .iter()
                .filter_map(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("duration_seconds").and_then(|d| d.as_u64()))
                })
                .sum::<u64>()
                / slow_builds.len() as u64;

            let priority = if avg_duration > 45 {
                GuidancePriority::High
            } else {
                GuidancePriority::Medium
            };

            items.push(GuidanceItem {
                id: format!("perf-slow-build-{}", now),
                category: GuidanceCategory::AtRisk,
                priority,
                title: "Slow build detected".to_string(),
                description: format!(
                    "Build times averaging {}s. Consider enabling Nx caching, parallel execution, or incremental builds.",
                    avg_duration
                ),
                action: Some(GuidanceAction {
                    action_type: "run_command".to_string(),
                    payload: serde_json::json!({
                        "command": "pnpm nx run-many -t build --parallel=3 --skip-nx-cache=false"
                    }),
                }),
                created_at: now,
            });
        }

        // Check for failing tests in recent events
        let failed_tests: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| {
                e.event_type == "test_run"
                    && e.outcome.as_deref() == Some("failure")
            })
            .collect();

        if failed_tests.len() > 2 {
            items.push(GuidanceItem {
                id: format!("perf-failing-tests-{}", now),
                category: GuidanceCategory::AtRisk,
                priority: GuidancePriority::High,
                title: "Multiple test failures detected".to_string(),
                description: format!(
                    "{} test runs failed recently. Review test logs and fix failing tests before continuing.",
                    failed_tests.len()
                ),
                action: Some(GuidanceAction {
                    action_type: "run_command".to_string(),
                    payload: serde_json::json!({ "command": "pnpm test" }),
                }),
                created_at: now,
            });
        }

        // Check for long-running scripts in activities
        let long_scripts: Vec<_> = input
            .recent_activities
            .iter()
            .filter(|a| {
                if a.activity_type != "script_execution" {
                    return false;
                }
                a.metadata.as_ref()
                    .and_then(|m| serde_json::from_str::<serde_json::Value>(m).ok())
                    .and_then(|v| v.get("duration_seconds").and_then(|d| d.as_u64()))
                    .map(|d| d > 60)
                    .unwrap_or(false)
            })
            .collect();

        if !long_scripts.is_empty() {
            items.push(GuidanceItem {
                id: format!("perf-long-script-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Medium,
                title: "Long-running scripts detected".to_string(),
                description: "Some scripts take over 60s. Consider optimizing with caching or parallel execution.".to_string(),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Security hygiene - scans for hardcoded secrets, insecure patterns
struct SecurityRule;

impl GuidanceRule for SecurityRule {
    fn name(&self) -> &str {
        "security"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        let mut env_files_found = false;
        let mut has_suspicious_changes = false;

        // Check git status for potential security issues
        if let Some(git) = &input.context.git_status {
            // Check if .env files are being committed
            let env_files: Vec<_> = git
                .modified_files
                .iter()
                .chain(git.staged_files.iter())
                .filter(|f| f.ends_with(".env") || f.contains(".env."))
                .collect();

            if !env_files.is_empty() {
                env_files_found = true;
                items.push(GuidanceItem {
                    id: format!("security-env-file-{}", now),
                    category: GuidanceCategory::AtRisk,
                    priority: GuidancePriority::Critical,
                    title: "Environment file in git".to_string(),
                    description: format!(
                        "{} .env file(s) detected in git changes. These may contain secrets and should be in .gitignore.",
                        env_files.len()
                    ),
                    action: Some(GuidanceAction {
                        action_type: "open_file".to_string(),
                        payload: serde_json::json!({ "file": ".gitignore" }),
                    }),
                    created_at: now,
                });
            }

            // Check for common secret patterns in modified files
            let suspicious_patterns = vec![
                "API_KEY", "SECRET_KEY", "PASSWORD", "TOKEN", "PRIVATE_KEY",
                "api_key", "secret_key", "password", "token", "private_key",
            ];

            for file in &git.modified_files {
                if suspicious_patterns.iter().any(|p| file.contains(p)) {
                    has_suspicious_changes = true;
                    break;
                }
            }

            if has_suspicious_changes {
                items.push(GuidanceItem {
                    id: format!("security-suspicious-{}", now),
                    category: GuidanceCategory::AtRisk,
                    priority: GuidancePriority::High,
                    title: "Potential secrets in modified files".to_string(),
                    description: "Modified files contain keywords like 'API_KEY', 'PASSWORD', etc. Ensure secrets are in environment variables, not hardcoded.".to_string(),
                    action: Some(GuidanceAction {
                        action_type: "run_command".to_string(),
                        payload: serde_json::json!({ "command": "git diff" }),
                    }),
                    created_at: now,
                });
            }
        }

        // Check for unencrypted database files in recent activities
        let db_activities: Vec<_> = input
            .recent_activities
            .iter()
            .filter(|a| {
                a.activity_type == "file_access"
                    && a.metadata.as_ref()
                        .map(|m| m.ends_with(".db") || m.ends_with(".sqlite"))
                        .unwrap_or(false)
            })
            .collect();

        if !db_activities.is_empty() {
            items.push(GuidanceItem {
                id: format!("security-db-encryption-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Medium,
                title: "Consider database encryption".to_string(),
                description: format!(
                    "{} database file(s) accessed. For sensitive data, consider using SQLCipher or encrypted storage.",
                    db_activities.len()
                ),
                action: None,
                created_at: now,
            });
        }

        // Positive: Good security practices detected
        if !env_files_found && !has_suspicious_changes {
            items.push(GuidanceItem {
                id: format!("security-good-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Low,
                title: "Good security hygiene".to_string(),
                description: "No obvious security issues detected in recent changes.".to_string(),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Dependency health - checks package freshness
struct DependencyRule;

impl GuidanceRule for DependencyRule {
    fn name(&self) -> &str {
        "dependencies"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Check recent files for package.json or Cargo.toml modifications
        let package_files: Vec<_> = input
            .context
            .recent_files
            .iter()
            .filter(|f| {
                f.path.ends_with("package.json")
                    || f.path.ends_with("Cargo.toml")
                    || f.path.ends_with("pnpm-lock.yaml")
            })
            .collect();

        if !package_files.is_empty() {
            items.push(GuidanceItem {
                id: format!("deps-modified-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Medium,
                title: "Dependency files modified".to_string(),
                description: "Package files changed. Run `pnpm install` to update dependencies.".to_string(),
                action: Some(GuidanceAction {
                    action_type: "run_command".to_string(),
                    payload: serde_json::json!({ "command": "pnpm install" }),
                }),
                created_at: now,
            });
        }

        // Check learning events for dependency update events
        let outdated_deps: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| {
                e.event_type == "dependency_check"
                    && e.outcome.as_deref() == Some("outdated")
            })
            .collect();

        if !outdated_deps.is_empty() {
            // Check severity from metadata
            let has_vulnerability = outdated_deps.iter().any(|e| {
                e.metadata.as_ref()
                    .map(|m| m.contains("vulnerability") || m.contains("security"))
                    .unwrap_or(false)
            });

            let priority = if has_vulnerability {
                GuidancePriority::High
            } else {
                GuidancePriority::Medium
            };

            items.push(GuidanceItem {
                id: format!("deps-outdated-{}", now),
                category: GuidanceCategory::AtRisk,
                priority,
                title: "Outdated dependencies detected".to_string(),
                description: format!(
                    "{} packages are outdated{}. Run `pnpm update` to upgrade.",
                    outdated_deps.len(),
                    if has_vulnerability { " (includes vulnerabilities)" } else { "" }
                ),
                action: Some(GuidanceAction {
                    action_type: "run_command".to_string(),
                    payload: serde_json::json!({ "command": "pnpm update" }),
                }),
                created_at: now,
            });
        }

        // Positive: Dependencies recently updated
        let updated_deps: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| {
                e.event_type == "dependency_update"
                    && e.outcome.as_deref() == Some("success")
            })
            .collect();

        if !updated_deps.is_empty() {
            items.push(GuidanceItem {
                id: format!("deps-updated-{}", now),
                category: GuidanceCategory::DoingRight,
                priority: GuidancePriority::Low,
                title: "Dependencies up to date".to_string(),
                description: format!(
                    "{} packages recently updated. Good job keeping dependencies fresh!",
                    updated_deps.len()
                ),
                action: None,
                created_at: now,
            });
        }

        items
    }
}

/// Rule: Predictive intelligence - ML-driven task completion predictions
struct PredictiveRule;

impl GuidanceRule for PredictiveRule {
    fn name(&self) -> &str {
        "predictive"
    }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        // Analyze task completion patterns from learning events
        let completed_tasks: Vec<_> = input
            .learning_events
            .iter()
            .filter(|e| {
                e.event_type == "task_completed"
                    && e.outcome.as_deref() == Some("success")
            })
            .collect();

        if completed_tasks.len() >= 5 {
            // Calculate average task duration from context metadata
            let durations: Vec<u64> = completed_tasks
                .iter()
                .filter_map(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("duration_minutes").and_then(|d| d.as_u64()))
                })
                .collect();

            if !durations.is_empty() {
                let avg_duration = durations.iter().sum::<u64>() / durations.len() as u64;
                let std_dev = {
                    let variance = durations
                        .iter()
                        .map(|&d| {
                            let diff = d as i64 - avg_duration as i64;
                            (diff * diff) as u64
                        })
                        .sum::<u64>()
                        / durations.len() as u64;
                    (variance as f64).sqrt() as u64
                };

                let confidence = if durations.len() >= 10 {
                    "high"
                } else if durations.len() >= 5 {
                    "medium"
                } else {
                    "low"
                };

                items.push(GuidanceItem {
                    id: format!("predict-duration-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Task duration prediction".to_string(),
                    description: format!(
                        "Based on {} completed tasks, similar tasks typically take {}±{} minutes ({} confidence).",
                        durations.len(),
                        avg_duration,
                        std_dev,
                        confidence
                    ),
                    action: None,
                    created_at: now,
                });
            }
        }

        // Predict optimal task ordering based on success patterns
        let in_progress_tasks: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "in_progress")
            .collect();

        let pending_tasks: Vec<_> = input
            .tasks
            .iter()
            .filter(|t| t.status == "pending" || t.status == "not_started")
            .collect();

        if in_progress_tasks.is_empty() && pending_tasks.len() > 1 {
            // Analyze success rates by task complexity from learning events
            let high_complexity_success = completed_tasks
                .iter()
                .filter(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("complexity").and_then(|c| c.as_str().map(|s| s.to_string())))
                        .map(|c| c == "high")
                        .unwrap_or(false)
                })
                .count();

            let low_complexity_success = completed_tasks
                .iter()
                .filter(|e| {
                    parse_context_json(&e.context)
                        .and_then(|c| c.as_object().map(|o| o.to_owned()))
                        .and_then(|obj| obj.get("complexity").and_then(|c| c.as_str().map(|s| s.to_string())))
                        .map(|c| c == "low")
                        .unwrap_or(false)
                })
                .count();

            if high_complexity_success > low_complexity_success {
                items.push(GuidanceItem {
                    id: format!("predict-ordering-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Optimal task ordering suggestion".to_string(),
                    description: "Your success rate is higher with complex tasks first. Consider starting with high-priority, challenging work while energy is fresh.".to_string(),
                    action: None,
                    created_at: now,
                });
            } else if low_complexity_success > 0 {
                items.push(GuidanceItem {
                    id: format!("predict-warmup-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Low,
                    title: "Warm-up task recommended".to_string(),
                    description: "You tend to succeed with simpler tasks first. Consider starting with a quick win to build momentum.".to_string(),
                    action: None,
                    created_at: now,
                });
            }
        }

        // Analyze productivity patterns by time of day
        let time_based_success: std::collections::HashMap<u8, usize> = completed_tasks
            .iter()
            .filter_map(|e| {
                parse_context_json(&e.context)
                    .and_then(|c| c.as_object().map(|o| o.to_owned()))
                    .and_then(|obj| obj.get("hour_of_day").and_then(|h| h.as_u64()))
                    .map(|h| h as u8)
            })
            .fold(std::collections::HashMap::new(), |mut acc, hour| {
                *acc.entry(hour).or_insert(0) += 1;
                acc
            });

        if let Some((peak_hour, count)) = time_based_success.iter().max_by_key(|(_, &c)| c) {
            if *count >= 3 {
                let current_hour = chrono::Local::now().hour() as u8;
                if current_hour == *peak_hour {
                    items.push(GuidanceItem {
                        id: format!("predict-peak-time-{}", now),
                        category: GuidanceCategory::DoingRight,
                        priority: GuidancePriority::Medium,
                        title: "Peak productivity time".to_string(),
                        description: format!(
                            "You're in your peak productivity window ({}:00-{}:00 based on {} successful completions). Great time for important work!",
                            peak_hour, peak_hour + 1, count
                        ),
                        action: None,
                        created_at: now,
                    });
                }
            }
        }

        items
    }
}

// Helper functions
fn timestamp_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Helper to safely parse JSON context from learning events
fn parse_context_json(context: &Option<String>) -> Option<serde_json::Value> {
    context
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context_engine::GitStatus;

    #[test]
    fn test_guidance_engine_creation() {
        let engine = GuidanceEngine::new();
        assert!(!engine.rules.is_empty());
    }

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
