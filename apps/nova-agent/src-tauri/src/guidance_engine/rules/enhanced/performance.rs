use super::super::GuidanceRule;
use crate::guidance_engine::types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
};
use crate::guidance_engine::utils::{parse_context_json, timestamp_now};

/// Rule: Performance optimization - detects slow builds, failing tests
pub(crate) struct PerformanceRule;

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
            .filter(|e| e.event_type == "test_run" && e.outcome.as_deref() == Some("failure"))
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
                a.metadata
                    .as_ref()
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
