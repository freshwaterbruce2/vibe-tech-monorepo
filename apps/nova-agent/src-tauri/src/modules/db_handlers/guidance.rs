use crate::modules::state::Config;
use crate::{context_engine, database, guidance_engine};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, info};

#[tauri::command]
pub async fn request_guidance(
    _context: serde_json::Value,
    _config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
    engine: State<'_, Arc<guidance_engine::GuidanceEngine>>,
    context_engine_state: State<'_, Arc<std::sync::Mutex<context_engine::ContextEngine>>>,
) -> Result<serde_json::Value, String> {
    debug!("Requesting guidance...");

    let db_guard = db.lock().await;
    let deep_work_minutes = if let Some(service) = db_guard.as_ref() {
        service.get_deep_work_minutes_24h().unwrap_or(0)
    } else {
        return Err("Database service not available".to_string());
    };
    drop(db_guard);

    let system_context = {
        let ce = context_engine_state.lock().unwrap();
        ce.get_snapshot_with_deep_work(deep_work_minutes)
    };

    let db_guard = db.lock().await;
    let (tasks, activities, learning_events) = if let Some(service) = db_guard.as_ref() {
        let tasks = service.get_tasks(None, Some(20)).unwrap_or_default();
        let activities = service
            .get_recent_activities(Some(20), None)
            .unwrap_or_default();
        let learning = service
            .get_learning_events(Some(10), None)
            .unwrap_or_default();
        (tasks, activities, learning)
    } else {
        (vec![], vec![], vec![])
    };
    drop(db_guard);

    let input = guidance_engine::GuidanceInput {
        context: system_context,
        tasks,
        recent_activities: activities,
        learning_events,
    };

    let guidance = engine.generate(&input);

    info!(
        "Generated guidance: {} next_steps, {} doing_right, {} at_risk",
        guidance.next_steps.len(),
        guidance.doing_right.len(),
        guidance.at_risk.len()
    );

    serde_json::to_value(guidance).map_err(|e| format!("Failed to serialize guidance: {}", e))
}

#[tauri::command]
pub async fn get_context_snapshot(
    _config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
    context_engine_state: State<'_, Arc<std::sync::Mutex<context_engine::ContextEngine>>>,
) -> Result<serde_json::Value, String> {
    debug!("Collecting context snapshot...");
    let deep_work_minutes = {
        let db_guard = db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.get_deep_work_minutes_24h().unwrap_or(0)
        } else {
            return Err("Database service not available".to_string());
        }
    };

    let mut snapshot = {
        let ce = context_engine_state.lock().unwrap();
        ce.get_snapshot()
    };
    if deep_work_minutes > 0 {
        snapshot.deep_work_minutes = deep_work_minutes;
    }
    Ok(serde_json::to_value(snapshot).map_err(|e| e.to_string())?)
}
