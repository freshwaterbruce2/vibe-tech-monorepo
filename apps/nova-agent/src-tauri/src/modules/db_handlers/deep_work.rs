use super::types::{DeepWorkData, DeepWorkSession, DeepWorkStats};
use crate::database;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::debug;

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
                        quality_score: 100,
                        primary_app: app,
                        switch_count: 0,
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
