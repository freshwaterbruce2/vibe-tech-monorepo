use super::types::StorageHealth;
use crate::database;
use crate::modules::state::Config;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::debug;

#[tauri::command]
pub async fn db_health_check(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<bool, String> {
    debug!("Checking database health");

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service
            .health_check()
            .map_err(|e| format!("Database health check failed: {}", e))
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn get_storage_health(
    config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<StorageHealth, String> {
    let db_initialized = db.lock().await.is_some();
    let database_path = config.database_path.clone();
    let on_d_drive = database_path.to_uppercase().starts_with("D:\\");

    let message = if !on_d_drive {
        "DATABASE_PATH must be on D: drive".to_string()
    } else if !db_initialized {
        "Database service failed to initialize".to_string()
    } else {
        "Storage healthy".to_string()
    };

    Ok(StorageHealth {
        database_path,
        on_d_drive,
        db_initialized,
        message,
    })
}
