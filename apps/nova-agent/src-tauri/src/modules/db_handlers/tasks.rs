use super::types::{CreateTaskRequest, CreateTaskResult};
use crate::database;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, info};

#[tauri::command]
pub async fn get_tasks(
    status_filter: Option<String>,
    limit: Option<u32>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::Task>, String> {
    debug!(
        "Getting tasks with filter: {:?}, limit: {:?}",
        status_filter, limit
    );

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_tasks(status_filter.as_deref(), limit)
            .map_err(|e| format!("Failed to get tasks: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_task_by_id(
    task_id: String,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Option<database::Task>, String> {
    debug!("Getting task by id: {}", task_id);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_task_by_id(&task_id)
            .map_err(|e| format!("Failed to get task: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn update_task_status(
    task_id: String,
    new_status: String,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<bool, String> {
    debug!("Updating task {} status to: {}", task_id, new_status);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .update_task_status(&task_id, &new_status)
            .map_err(|e| format!("Failed to update task: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_focus_state(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Option<database::FocusState>, String> {
    debug!("Getting focus state");

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_focus_state()
            .map_err(|e| format!("Failed to get focus state: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_task_stats(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<std::collections::HashMap<String, i64>, String> {
    debug!("Getting task statistics");

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_task_stats()
            .map_err(|e| format!("Failed to get task stats: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn create_task(
    request: CreateTaskRequest,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<CreateTaskResult, String> {
    info!("Creating task: {}", request.title);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        if let Ok(existing_tasks) = service.get_tasks(None, Some(100)) {
            for task in &existing_tasks {
                let title_similarity = calculate_similarity(&request.title, &task.title);

                if title_similarity > 0.8 {
                    info!(
                        "Duplicate task detected: {} matches {}",
                        request.title, task.title
                    );
                    return Ok(CreateTaskResult {
                        task_id: task.id.clone(),
                        is_duplicate: true,
                        duplicate_of: Some(task.id.clone()),
                    });
                }
            }
        }

        let extra_metadata = if let Some(project_path) = request.project_path.as_ref() {
            match crate::modules::project_review::find_latest_review_for_project(project_path) {
                Ok(Some(review)) => Some(serde_json::json!({
                    "project_path": project_path,
                    "review_artifact_path": review.artifact_path,
                    "review_completed": true,
                    "review_target_path": review.reviewed_path,
                    "review_evidence_count": review.evidence_count,
                    "reviewed_at": review.reviewed_at,
                    "review_version": review.review_version,
                    "plan_grounded": true,
                    "generic_plan_flags": [],
                })),
                Ok(None) => Some(serde_json::json!({
                    "project_path": project_path,
                    "review_completed": false,
                    "plan_grounded": false,
                    "generic_plan_flags": ["missing_review"],
                })),
                Err(e) => return Err(format!("Failed to resolve project review: {}", e)),
            }
        } else {
            None
        };

        let task_id = service
            .create_task(
                &request.title,
                request.description.as_deref(),
                request.priority.as_deref().unwrap_or("medium"),
                request.tags.as_ref().map(|t| t.as_slice()),
                request.parent_task_id.as_deref(),
                request.estimated_minutes,
                extra_metadata,
            )
            .map_err(|e| format!("Failed to create task: {}", e))?;

        info!("Task created: {}", task_id);
        Ok(CreateTaskResult {
            task_id,
            is_duplicate: false,
            duplicate_of: None,
        })
    } else {
        Err("Database service not available".to_string())
    }
}

fn calculate_similarity(a: &str, b: &str) -> f32 {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();
    let a_words: std::collections::HashSet<&str> = a_lower.split_whitespace().collect();
    let b_words: std::collections::HashSet<&str> = b_lower.split_whitespace().collect();

    if a_words.is_empty() || b_words.is_empty() {
        return 0.0;
    }

    let intersection = a_words.intersection(&b_words).count();
    let union = a_words.union(&b_words).count();

    intersection as f32 / union as f32
}
