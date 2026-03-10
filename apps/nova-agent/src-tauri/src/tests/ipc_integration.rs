use crate::database::DatabaseService;
use std::time::{SystemTime, UNIX_EPOCH};

#[tokio::test]
async fn test_ipc_activity_logging_flow() {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("System clock error")
        .as_nanos();
    let temp_dir = std::env::temp_dir().join(format!("nova_test_ipc_{unique}"));
    std::fs::create_dir_all(&temp_dir).expect("Failed to create temp dir");

    let db_service = DatabaseService::new(temp_dir.clone()).expect("Failed to init DB");
    db_service
        .init_memory_tables()
        .expect("Failed to init tables");
    db_service
        .create_activity_table()
        .expect("Failed to init activity table");

    db_service
        .log_activity("ipc_test_event", "Testing IPC bridge logic via Rust test")
        .expect("Failed to log");

    let activities = db_service
        .get_recent_activities(Some(1), None)
        .expect("Failed to get activities");
    let activity = activities.first().expect("Expected at least one activity");

    assert_eq!(activity.activity_type, "ipc_test_event");
    assert_eq!(
        activity.details.as_deref(),
        Some("Testing IPC bridge logic via Rust test")
    );

    let _ = std::fs::remove_dir_all(&temp_dir);
}
