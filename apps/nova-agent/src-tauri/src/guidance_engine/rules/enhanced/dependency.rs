use super::super::GuidanceRule;
use crate::guidance_engine::types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
};
use crate::guidance_engine::utils::timestamp_now;

/// Rule: Dependency health - checks package freshness
pub(crate) struct DependencyRule;

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
                description: "Package files changed. Run `pnpm install` to update dependencies."
                    .to_string(),
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
                e.event_type == "dependency_check" && e.outcome.as_deref() == Some("outdated")
            })
            .collect();

        if !outdated_deps.is_empty() {
            // Check severity from metadata
            let has_vulnerability = outdated_deps.iter().any(|e| {
                e.metadata
                    .as_ref()
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
                    if has_vulnerability {
                        " (includes vulnerabilities)"
                    } else {
                        ""
                    }
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
                e.event_type == "dependency_update" && e.outcome.as_deref() == Some("success")
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
