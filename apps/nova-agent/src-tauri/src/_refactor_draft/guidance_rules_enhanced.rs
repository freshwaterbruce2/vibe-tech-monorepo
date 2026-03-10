//! Enhanced Guidance Rules for Nova Agent (Phase 1 - 2026-01-16)
//!
//! Advanced rules: Performance, Security, Dependency, Predictive

use crate::guidance_types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
    GuidanceRule, parse_context_json, timestamp_now,
};
use chrono::Timelike;

pub struct PerformanceRule;

impl GuidanceRule for PerformanceRule {
    fn name(&self) -> &str { "performance" }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        let slow_builds: Vec<_> = input.learning_events.iter()
            .filter(|e| e.event_type == "build_completed"
                && parse_context_json(&e.context)
                    .and_then(|c| c.get("duration_seconds").and_then(|d| d.as_u64()))
                    .map(|d| d > 30).unwrap_or(false))
            .collect();

        if !slow_builds.is_empty() {
            items.push(GuidanceItem {
                id: format!("perf-slow-build-{}", now),
                category: GuidanceCategory::AtRisk,
                priority: GuidancePriority::High,
                title: "Slow build detected".to_string(),
                description: "Build times exceeding 30s. Consider Nx caching.".to_string(),
                action: None,
                created_at: now,
            });
        }

        let failed_tests: Vec<_> = input.learning_events.iter()
            .filter(|e| e.event_type == "test_run" && e.outcome.as_deref() == Some("failure"))
            .collect();

        if failed_tests.len() > 2 {
            items.push(GuidanceItem {
                id: format!("perf-failing-tests-{}", now),
                category: GuidanceCategory::AtRisk,
                priority: GuidancePriority::High,
                title: "Multiple test failures".to_string(),
                description: format!("{} test runs failed recently.", failed_tests.len()),
                action: None,
                created_at: now,
            });
        }
        items
    }
}

pub struct SecurityRule;

impl GuidanceRule for SecurityRule {
    fn name(&self) -> &str { "security" }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        if let Some(git) = &input.context.git_status {
            let env_files: Vec<_> = git.modified_files.iter()
                .chain(git.staged_files.iter())
                .filter(|f| f.ends_with(".env") || f.contains(".env."))
                .collect();

            if !env_files.is_empty() {
                items.push(GuidanceItem {
                    id: format!("security-env-file-{}", now),
                    category: GuidanceCategory::AtRisk,
                    priority: GuidancePriority::Critical,
                    title: "Environment file in git".to_string(),
                    description: format!("{} .env file(s) in git. Should be in .gitignore.", env_files.len()),
                    action: None,
                    created_at: now,
                });
            }
        }
        items
    }
}

pub struct DependencyRule;

impl GuidanceRule for DependencyRule {
    fn name(&self) -> &str { "dependencies" }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        let package_files: Vec<_> = input.context.recent_files.iter()
            .filter(|f| f.path.ends_with("package.json") || f.path.ends_with("Cargo.toml"))
            .collect();

        if !package_files.is_empty() {
            items.push(GuidanceItem {
                id: format!("deps-modified-{}", now),
                category: GuidanceCategory::NextSteps,
                priority: GuidancePriority::Medium,
                title: "Dependency files modified".to_string(),
                description: "Run `pnpm install` to update dependencies.".to_string(),
                action: None,
                created_at: now,
            });
        }
        items
    }
}

pub struct PredictiveRule;

impl GuidanceRule for PredictiveRule {
    fn name(&self) -> &str { "predictive" }

    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem> {
        let mut items = Vec::new();
        let now = timestamp_now();

        let completed_tasks: Vec<_> = input.learning_events.iter()
            .filter(|e| e.event_type == "task_completed" && e.outcome.as_deref() == Some("success"))
            .collect();

        if completed_tasks.len() >= 5 {
            let durations: Vec<u64> = completed_tasks.iter()
                .filter_map(|e| parse_context_json(&e.context)
                    .and_then(|c| c.get("duration_minutes").and_then(|d| d.as_u64())))
                .collect();

            if !durations.is_empty() {
                let avg = durations.iter().sum::<u64>() / durations.len() as u64;
                items.push(GuidanceItem {
                    id: format!("predict-duration-{}", now),
                    category: GuidanceCategory::NextSteps,
                    priority: GuidancePriority::Medium,
                    title: "Task duration prediction".to_string(),
                    description: format!("Similar tasks typically take ~{} minutes.", avg),
                    action: None,
                    created_at: now,
                });
            }
        }

        // Peak productivity time
        let time_success: std::collections::HashMap<u8, usize> = completed_tasks.iter()
            .filter_map(|e| parse_context_json(&e.context)
                .and_then(|c| c.get("hour_of_day").and_then(|h| h.as_u64()))
                .map(|h| h as u8))
            .fold(std::collections::HashMap::new(), |mut acc, hour| {
                *acc.entry(hour).or_insert(0) += 1;
                acc
            });

        if let Some((peak_hour, count)) = time_success.iter().max_by_key(|(_, &c)| c) {
            if *count >= 3 && chrono::Local::now().hour() as u8 == *peak_hour {
                items.push(GuidanceItem {
                    id: format!("predict-peak-{}", now),
                    category: GuidanceCategory::DoingRight,
                    priority: GuidancePriority::Medium,
                    title: "Peak productivity time".to_string(),
                    description: format!("You're in your peak window ({}:00)!", peak_hour),
                    action: None,
                    created_at: now,
                });
            }
        }
        items
    }
}
