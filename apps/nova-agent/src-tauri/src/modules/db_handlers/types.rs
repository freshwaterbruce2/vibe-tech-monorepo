use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TradingConfig {
    pub data_dir: String,
    pub logs_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageHealth {
    pub database_path: String,
    pub on_d_drive: bool,
    pub db_initialized: bool,
    pub message: String,
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
