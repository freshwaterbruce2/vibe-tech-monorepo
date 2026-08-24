use crate::database::types::Task;
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Default, Deserialize)]
pub(crate) struct TaskExecutionMetadata {
    pub description: Option<String>,
    pub project_path: Option<String>,
    pub auto_execute: Option<bool>,
    pub risk: Option<String>,
    pub max_duration_minutes: Option<u64>,
    pub requires_approval: Option<bool>,
    pub approved_for_execution: Option<bool>,
    pub approved_plan_digest: Option<String>,
    pub review_artifact_path: Option<String>,
    pub review_completed: Option<bool>,
    pub review_target_path: Option<String>,
    pub review_evidence_count: Option<u64>,
    pub reviewed_at: Option<String>,
    pub review_version: Option<String>,
    pub plan_grounded: Option<bool>,
    pub generic_plan_flags: Option<Vec<String>>,
}

impl TaskExecutionMetadata {
    pub fn from_task(task: &Task) -> Self {
        task.metadata
            .as_deref()
            .and_then(|raw| serde_json::from_str::<Self>(raw).ok())
            .unwrap_or_default()
    }
}

pub(crate) fn append_checkpoint_item(target: &mut Value, item: Value) {
    let mut items = target.as_array().cloned().unwrap_or_default();
    items.push(item);
    *target = Value::Array(items);
}

pub(crate) fn review_gate_error(
    task_id: &str,
    metadata: &TaskExecutionMetadata,
    project_path: &str,
) -> Option<String> {
    let flags = metadata.generic_plan_flags.clone().unwrap_or_default();
    if !metadata.review_completed.unwrap_or(false) {
        return Some(format!(
            "Task {task_id} is blocked: no grounded project review is attached. Run `nova analyze --path {project_path}` first."
        ));
    }
    if !metadata.plan_grounded.unwrap_or(false) || !flags.is_empty() {
        return Some(format!(
            "Task {task_id} is blocked: the plan is not grounded. Flags: {}",
            if flags.is_empty() {
                "none supplied".to_string()
            } else {
                flags.join(" | ")
            },
        ));
    }
    let artifact = metadata.review_artifact_path.as_deref();
    match crate::modules::project_review::validate_review_for_project(project_path, artifact) {
        Ok(review) => {
            let target = metadata.review_target_path.as_deref().unwrap_or_default();
            if !target.is_empty() && review.reviewed_path.to_lowercase() != target.to_lowercase() {
                Some(format!(
                    "Task {task_id} is blocked: review target mismatch. Metadata points to {target}, artifact points to {}.",
                    review.reviewed_path
                ))
            } else if metadata.review_evidence_count.unwrap_or(0) > review.evidence_count as u64 {
                Some(format!(
                    "Task {task_id} is blocked: review evidence count regressed from {} to {}.",
                    metadata.review_evidence_count.unwrap_or(0),
                    review.evidence_count
                ))
            } else {
                None
            }
        }
        Err(error) => Some(format!("Task {task_id} is blocked: {error}")),
    }
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn execution_prompt(
    task: &Task,
    description: &str,
    project_path: &str,
    risk: &str,
    max_duration_minutes: u64,
    metadata: &TaskExecutionMetadata,
) -> String {
    format!(
        "You have been assigned a task to complete autonomously.\n\n\
         TASK DETAILS:\n- Title: {}\n- Description: {}\n- Project Path: {}\n- Risk: {}\n\
         - Max Duration Minutes: {}\n- Review Completed: {}\n- Review Version: {}\n\
         - Review Timestamp: {}\n- Review Evidence Count: {}\n\n\
         EXECUTION CONSTRAINTS:\n1. Stay within the reviewed project path.\n\
         2. Base changes on grounded review context and files verified during execution.\n\
         3. Do not invent files or deliverables.\n4. Stop if reviewed evidence and current files disagree.\n\
         5. Verify changes before claiming completion.\n\n\
         Available tools: read_file, write_file, list_directory, execute_code, internet_search\n\n\
         Begin working on this task now.",
        task.title,
        description,
        project_path,
        risk,
        max_duration_minutes,
        metadata.review_completed.unwrap_or(false),
        metadata.review_version.as_deref().unwrap_or("unknown"),
        metadata.reviewed_at.as_deref().unwrap_or("unknown"),
        metadata.review_evidence_count.unwrap_or(0),
    )
}
