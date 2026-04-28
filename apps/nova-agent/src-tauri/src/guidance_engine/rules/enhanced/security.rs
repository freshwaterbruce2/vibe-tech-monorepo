use super::super::GuidanceRule;
use crate::guidance_engine::types::{
    GuidanceAction, GuidanceCategory, GuidanceInput, GuidanceItem, GuidancePriority,
};
use crate::guidance_engine::utils::timestamp_now;

/// Rule: Security hygiene - scans for hardcoded secrets, insecure patterns
pub(crate) struct SecurityRule;

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
                "API_KEY",
                "SECRET_KEY",
                "PASSWORD",
                "TOKEN",
                "PRIVATE_KEY",
                "api_key",
                "secret_key",
                "password",
                "token",
                "private_key",
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
                    && a.metadata
                        .as_ref()
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
