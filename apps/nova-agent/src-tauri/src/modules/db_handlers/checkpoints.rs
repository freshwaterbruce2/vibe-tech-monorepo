use crate::database::{self, CheckpointClassification, ResumeCandidate};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

type DbState = Arc<AsyncMutex<Option<database::DatabaseService>>>;

#[tauri::command]
pub async fn get_resume_candidates(db: State<'_, DbState>) -> Result<Vec<ResumeCandidate>, String> {
    let guard = db.lock().await;
    guard
        .as_ref()
        .ok_or_else(|| "Database service not available".to_string())?
        .list_resume_candidates()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resume_task(
    task_id: String,
    revision: i64,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db.lock().await;
    let service = guard
        .as_ref()
        .ok_or_else(|| "Database service not available".to_string())?;
    let candidate = service.classify_checkpoint_current(&task_id)?;
    if candidate.checkpoint.revision != revision {
        return Err("checkpoint revision changed; refresh before resuming".to_string());
    }
    if candidate.classification != CheckpointClassification::Resumable {
        return Err(format!(
            "checkpoint is {:?} and cannot be resumed automatically",
            candidate.classification
        ));
    }
    let mut content = candidate.checkpoint.content;
    content.state = "queued".to_string();
    if content.next_action.get("secure_ref").is_none() {
        content.next_action = serde_json::json!({"kind":"execute_next"});
    }
    service.save_checkpoint(&task_id, revision, &content)?;
    service
        .update_task_status(&task_id, "ready")
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn decide_task_approval(
    task_id: String,
    revision: i64,
    action_fingerprint: String,
    approved: bool,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db.lock().await;
    guard
        .as_ref()
        .ok_or_else(|| "Database service not available".to_string())?
        .decide_approval(&task_id, revision, &action_fingerprint, approved)
}

#[tauri::command]
pub async fn start_task_over(task_id: String, db: State<'_, DbState>) -> Result<(), String> {
    let guard = db.lock().await;
    guard
        .as_ref()
        .ok_or_else(|| "Database service not available".to_string())?
        .start_task_over(&task_id)
}

#[tauri::command]
pub async fn reconcile_task_action(
    task_id: String,
    action_id: String,
    decision: String,
    evidence: Option<String>,
    db: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db.lock().await;
    guard
        .as_ref()
        .ok_or_else(|| "Database service not available".to_string())?
        .reconcile_action(&task_id, &action_id, &decision, evidence.as_deref())
}
