use crate::database;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, error, info};

#[tauri::command]
pub async fn log_activity(
    activity_type: String,
    details: String,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<(), String> {
    debug!("Logging activity: {} - {}", activity_type, details);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        if let Err(e) = service.log_activity(&activity_type, &details) {
            error!("Failed to log activity to DB: {}", e);
        } else {
            info!("Activity logged to DB: {} - {}", activity_type, details);
        }
    } else {
        info!("Database service not available, skipping activity log");
    }

    Ok(())
}

#[tauri::command]
pub async fn get_recent_activities(
    limit: Option<u32>,
    activity_type_filter: Option<String>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::Activity>, String> {
    debug!(
        "Getting recent activities, limit: {:?}, filter: {:?}",
        limit, activity_type_filter
    );

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_recent_activities(limit, activity_type_filter.as_deref())
            .map_err(|e| format!("Failed to get activities: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_learning_events(
    limit: Option<u32>,
    event_type_filter: Option<String>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::LearningEvent>, String> {
    debug!(
        "Getting learning events, limit: {:?}, filter: {:?}",
        limit, event_type_filter
    );

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_learning_events(limit, event_type_filter.as_deref())
            .map_err(|e| format!("Failed to get learning events: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_today_activity_count(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<i64, String> {
    debug!("Getting today's activity count");

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_today_activity_count()
            .map_err(|e| format!("Failed to get today's activity count: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn log_learning_event(
    event_type: String,
    context: String,
    outcome: String,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<(), String> {
    debug!("Logging learning event: {} - {}", event_type, outcome);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .log_learning_event(&event_type, &context, &outcome)
            .map_err(|e| format!("Failed to log learning event: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_activities_in_range(
    start_timestamp: i64,
    end_timestamp: i64,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::Activity>, String> {
    debug!(
        "Getting activities in range: {} to {}",
        start_timestamp, end_timestamp
    );

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_activities_in_range(start_timestamp, end_timestamp)
            .map_err(|e| format!("Failed to get activities in range: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_learning_by_outcome(
    outcome: String,
    limit: Option<u32>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::LearningEvent>, String> {
    debug!("Getting learning events by outcome: {}", outcome);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_learning_by_outcome(&outcome, limit)
            .map_err(|e| format!("Failed to get learning by outcome: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}
