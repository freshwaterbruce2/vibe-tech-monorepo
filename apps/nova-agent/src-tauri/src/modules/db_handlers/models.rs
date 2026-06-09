use crate::database;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::debug;

#[tauri::command]
pub async fn get_models_from_db(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<Vec<database::DbModel>, String> {
    debug!("Getting models from database");

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .get_models()
            .map_err(|e| format!("Failed to get models from database: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}
