use serde::de::DeserializeOwned;

pub(super) const MAX_TOOL_ARG_BYTES: usize = 20_000;
pub(super) const MAX_DESCRIPTION_BYTES: usize = 16_384;
pub(super) const MAX_QUERY_BYTES: usize = 1_024;
pub(super) const MAX_TASK_DURATION_MINUTES: u64 = 240;
pub(super) const MAX_TITLE_BYTES: usize = 256;
pub(super) const MAX_HISTORY_MESSAGES: usize = 40;

#[derive(Debug, serde::Deserialize)]
pub(super) struct ExecuteCodeArgs {
    pub(super) language: String,
    pub(super) code: String,
    #[serde(default)]
    pub(super) confirmed: Option<bool>,
}

#[derive(Debug, serde::Deserialize)]
pub(super) struct PathArg {
    pub(super) path: String,
}

#[derive(Debug, serde::Deserialize)]
pub(super) struct WriteFileArgs {
    pub(super) path: String,
    pub(super) content: String,
}

#[derive(Debug, serde::Deserialize)]
pub(super) struct SearchArg {
    pub(super) query: String,
}

#[derive(Debug, serde::Deserialize)]
pub(super) struct InspectActionArg {
    pub(super) action: String,
}

#[derive(Debug, serde::Deserialize)]
pub(super) struct CreateTaskArgs {
    pub(super) title: String,
    #[serde(default)]
    pub(super) description: Option<String>,
    #[serde(default)]
    pub(super) project_path: Option<String>,
    #[serde(default)]
    pub(super) priority: Option<String>,
    #[serde(default)]
    pub(super) auto_execute: Option<bool>,
    #[serde(default)]
    pub(super) risk: Option<String>,
    #[serde(default)]
    pub(super) max_duration_minutes: Option<u64>,
    #[serde(default)]
    pub(super) requires_approval: Option<bool>,
}
pub(super) fn validate_tool_args(raw: &str) -> Result<serde_json::Value, String> {
    if raw.len() > MAX_TOOL_ARG_BYTES {
        return Err("Tool arguments payload is too large".to_string());
    }
    if raw
        .chars()
        .any(|c| c.is_control() && c != '\n' && c != '\r')
    {
        return Err("Tool arguments contain control characters".to_string());
    }
    serde_json::from_str(raw).map_err(|e| format!("Invalid tool args JSON: {}", e))
}

pub(super) fn parse_tool_args<T: DeserializeOwned>(raw: &str) -> Result<T, String> {
    let value = validate_tool_args(raw)?;
    serde_json::from_value(value).map_err(|e| format!("Invalid tool args payload: {}", e))
}

pub(super) fn is_path_token_blocked(path: &str) -> bool {
    let lowered = path.to_lowercase();
    lowered.contains("%2f")
        || lowered.contains("%5c")
        || path.contains("..\\")
        || path.contains("../")
        || path.contains('\0')
}

pub(super) fn validate_title(title: &str) -> Result<(), String> {
    let trimmed = title.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_TITLE_BYTES {
        return Err("Title is invalid".to_string());
    }
    if trimmed.contains('\u{0}') || trimmed.chars().any(|c| c.is_control()) {
        return Err("Title contains invalid characters".to_string());
    }
    Ok(())
}

pub(super) fn sanitize_description(text: &str) -> Result<(), String> {
    if text.is_empty() || text.len() > MAX_DESCRIPTION_BYTES {
        return Err("Description is invalid".to_string());
    }
    if text.contains('\u{0}')
        || text
            .chars()
            .any(|c| c.is_control() && c != '\n' && c != '\r' && c != '\t')
    {
        return Err("Description contains invalid characters".to_string());
    }
    Ok(())
}

pub(super) fn validate_search_query(query: &str) -> Result<(), String> {
    let trimmed = query.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_QUERY_BYTES {
        return Err("Search query is invalid".to_string());
    }
    if trimmed.contains('\u{0}')
        || trimmed
            .chars()
            .any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r')
    {
        return Err("Search query contains invalid characters".to_string());
    }
    Ok(())
}

pub(super) fn validate_priority(priority: &str) -> Result<String, String> {
    let normalized = priority.trim().to_lowercase();
    if ["low", "medium", "high", "urgent"].contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err("Unsupported task priority".to_string())
    }
}

pub(super) fn parse_task_policy(payload: &CreateTaskArgs) -> (bool, String, u64, bool) {
    let auto_execute = payload.auto_execute.unwrap_or(false);
    let risk = payload
        .risk
        .as_ref()
        .map(|value| value.to_lowercase())
        .filter(|value| ["low", "medium", "high", "critical"].contains(&value.as_str()))
        .unwrap_or_else(|| "medium".to_string());

    let max_duration_minutes = payload
        .max_duration_minutes
        .unwrap_or(15)
        .min(MAX_TASK_DURATION_MINUTES)
        .max(1);

    let requires_approval = payload
        .requires_approval
        .unwrap_or(risk == "high" || risk == "critical");

    (auto_execute, risk, max_duration_minutes, requires_approval)
}

pub(super) fn detect_generic_plan_flags(
    description: &str,
    project_path: &str,
    review: &crate::modules::project_review::ProjectReviewSummary,
) -> Vec<String> {
    let mut flags = Vec::new();
    let description_lower = description.to_lowercase();

    let placeholder_patterns = [
        "tbd",
        "to be determined",
        "placeholder",
        "your_project",
        "example project",
        "generic plan",
    ];

    if placeholder_patterns
        .iter()
        .any(|pattern| description_lower.contains(pattern))
    {
        flags.push("placeholder_language".to_string());
    }

    let missing_paths =
        crate::modules::project_review::collect_missing_path_references(description);
    if !missing_paths.is_empty() {
        flags.push(format!(
            "references_missing_paths: {}",
            missing_paths.join(", ")
        ));
    }

    let normalized_project_path = project_path.to_lowercase();
    let evidence_tokens = review
        .evidence_paths
        .iter()
        .filter_map(|path| {
            std::path::Path::new(path)
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.to_lowercase())
        })
        .collect::<Vec<_>>();

    if !evidence_tokens.is_empty()
        && !evidence_tokens
            .iter()
            .any(|token| description_lower.contains(token))
        && !description_lower.contains(&normalized_project_path)
    {
        flags.push("no_review_evidence_reference".to_string());
    }

    flags
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modules::project_review::ProjectReviewSummary;

    #[test]
    fn validate_tool_args_rejects_control_characters() {
        let result = validate_tool_args("{\"query\":\"bad\u{0001}\"}");
        assert!(result.is_err());
    }

    #[test]
    fn task_policy_defaults_to_safe_values() {
        let payload = CreateTaskArgs {
            title: "Review project".to_string(),
            description: Some("Inspect files".to_string()),
            project_path: Some(r"C:\dev\apps\nova-agent".to_string()),
            priority: Some("medium".to_string()),
            auto_execute: None,
            risk: None,
            max_duration_minutes: None,
            requires_approval: None,
        };

        let (auto_execute, risk, max_duration_minutes, requires_approval) =
            parse_task_policy(&payload);

        assert!(!auto_execute);
        assert_eq!(risk, "medium");
        assert_eq!(max_duration_minutes, 15);
        assert!(!requires_approval);
    }

    #[test]
    fn high_risk_tasks_require_approval() {
        let payload = CreateTaskArgs {
            title: "Run dangerous migration".to_string(),
            description: Some("Apply risky change".to_string()),
            project_path: Some(r"C:\dev\apps\nova-agent".to_string()),
            priority: Some("high".to_string()),
            auto_execute: Some(true),
            risk: Some("critical".to_string()),
            max_duration_minutes: Some(999),
            requires_approval: None,
        };

        let (auto_execute, risk, max_duration_minutes, requires_approval) =
            parse_task_policy(&payload);

        assert!(auto_execute);
        assert_eq!(risk, "critical");
        assert_eq!(max_duration_minutes, MAX_TASK_DURATION_MINUTES);
        assert!(requires_approval);
    }

    #[test]
    fn generic_plan_flags_require_review_evidence_references() {
        let review = ProjectReviewSummary {
            artifact_path: r"D:\databases\nova-agent\reviews\nova-agent.json".to_string(),
            reviewed_path: r"C:\dev\apps\nova-agent".to_string(),
            reviewed_at: "2026-03-09T10:00:00Z".to_string(),
            review_version: "grounded-review-v1".to_string(),
            evidence_count: 2,
            evidence_paths: vec![
                r"C:\dev\apps\nova-agent\package.json".to_string(),
                r"C:\dev\apps\nova-agent\src-tauri\src\task_executor.rs".to_string(),
            ],
        };

        let flags = detect_generic_plan_flags(
            "Create a comprehensive dashboard and write docs later",
            r"C:\dev\apps\nova-agent",
            &review,
        );

        assert!(flags
            .iter()
            .any(|flag| flag == "no_review_evidence_reference"));
    }
}
