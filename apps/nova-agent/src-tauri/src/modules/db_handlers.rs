use crate::database;
use crate::modules::state::Config;
use crate::{context_engine, guidance_engine};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct TradingConfig {
    data_dir: String,
    logs_dir: String,
}

#[tauri::command]
pub async fn get_trading_config(config: State<'_, Config>) -> Result<TradingConfig, String> {
    Ok(TradingConfig {
        data_dir: config.trading_data_dir.clone(),
        logs_dir: config.trading_logs_dir.clone(),
    })
}

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

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageHealth {
    pub database_path: String,
    pub on_d_drive: bool,
    pub db_initialized: bool,
    pub message: String,
}

/// Expose storage configuration/health to the frontend for fail-fast UI warnings
#[tauri::command]
pub async fn get_storage_health(
    config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<StorageHealth, String> {
    let db_initialized = db.lock().await.is_some();
    let database_path = config.database_path.clone();
    let on_d_drive = database_path
        .to_uppercase()
        .starts_with("D:\\");

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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
    pub parent_task_id: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub project_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTaskResult {
    pub task_id: String,
    pub is_duplicate: bool,
    pub duplicate_of: Option<String>,
}

/// Create a task with duplicate detection
#[tauri::command]
pub async fn create_task(
    request: CreateTaskRequest,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<CreateTaskResult, String> {
    info!("Creating task: {}", request.title);

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        // Check for duplicates first - only check title similarity
        if let Ok(existing_tasks) = service.get_tasks(None, Some(100)) {
            for task in &existing_tasks {
                let title_similarity = calculate_similarity(&request.title, &task.title);
                
                // Title >80% = duplicate
                if title_similarity > 0.8 {
                    info!("Duplicate task detected: {} matches {}", request.title, task.title);
                    return Ok(CreateTaskResult {
                        task_id: task.id.clone(),
                        is_duplicate: true,
                        duplicate_of: Some(task.id.clone()),
                    });
                }
            }
        }

        // No duplicate found, create new task
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

/// Calculate similarity between two strings (simple word overlap)
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

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepWorkSession {
    pub id: String,
    pub start_timestamp: i64,
    pub duration_minutes: u32,
    pub quality_score: u32,
    pub primary_app: String,
    pub switch_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepWorkStats {
    pub total_minutes: u32,
    pub total_sessions: u32,
    pub average_duration: f32,
    pub longest_session: u32,
    pub weekly_goal_progress: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepWorkData {
    pub stats: DeepWorkStats,
    pub sessions: Vec<DeepWorkSession>,
}

#[tauri::command]
pub async fn get_deep_work_data(
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<DeepWorkData, String> {
    debug!("Getting deep work data");

    let db_guard = db.lock().await;
    let service = if let Some(service) = db_guard.as_ref() {
        service
    } else {
        return Err("Database service not available".to_string());
    };

    // Get deep work activities from the last 7 days
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let week_ago = now - (7 * 24 * 60 * 60);

    let activities = service
        .get_activities_in_range(week_ago, now)
        .map_err(|e| format!("Failed to get activities: {}", e))?;

    let mut sessions = Vec::new();
    let mut total_minutes = 0;
    let mut longest_session = 0;

    for activity in activities {
        if activity.activity_type == "deep_work" {
            if let Some(details) = &activity.details {
                // Expected format: deep_work|app|minutes
                let parts: Vec<&str> = details.split('|').collect();
                if parts.len() >= 3 {
                    let app = parts[1].to_string();
                    let minutes = parts[2].parse::<u32>().unwrap_or(0);
                    
                    total_minutes += minutes;
                    if minutes > longest_session {
                        longest_session = minutes;
                    }

                    sessions.push(DeepWorkSession {
                        id: activity.id.to_string(),
                        start_timestamp: activity.timestamp,
                        duration_minutes: minutes,
                        quality_score: 100, // Placeholder
                        primary_app: app,
                        switch_count: 0, // Placeholder
                    });
                }
            }
        }
    }

    let total_sessions = sessions.len() as u32;
    let average_duration = if total_sessions > 0 {
        total_minutes as f32 / total_sessions as f32
    } else {
        0.0
    };

    // Calculate progress towards 10 hours (600 minutes) weekly goal
    let weekly_goal_progress = (total_minutes as f32 / 600.0) * 100.0;

    Ok(DeepWorkData {
        stats: DeepWorkStats {
            total_minutes,
            total_sessions,
            average_duration,
            longest_session,
            weekly_goal_progress,
        },
        sessions,
    })
}
