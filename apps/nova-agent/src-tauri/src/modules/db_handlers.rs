#![allow(unused_imports)]
/// Database-related Tauri command compatibility facade.
pub(crate) mod activity;
pub(crate) mod config;
pub(crate) mod deep_work;
pub(crate) mod guidance;
pub(crate) mod health;
pub(crate) mod tasks;
mod types;

pub use activity::{
    get_activities_in_range, get_learning_by_outcome, get_learning_events, get_recent_activities,
    get_today_activity_count, log_activity, log_learning_event,
};
pub use config::get_trading_config;
pub use deep_work::get_deep_work_data;
pub use guidance::{get_context_snapshot, request_guidance};
pub use health::{db_health_check, get_storage_health};
pub use tasks::{
    create_task, get_focus_state, get_task_by_id, get_task_stats, get_tasks, update_task_status,
};
pub use types::{
    CreateTaskRequest, CreateTaskResult, DeepWorkData, DeepWorkSession, DeepWorkStats,
    StorageHealth, TradingConfig,
};
