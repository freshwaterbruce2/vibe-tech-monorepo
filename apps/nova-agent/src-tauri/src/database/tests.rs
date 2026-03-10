use super::*;
use tempfile::tempdir;

#[test]
fn test_database_initialization_and_wal() {
    let dir = tempdir().unwrap();
    let path = dir.path().to_path_buf();

    // Initialize
    let service = DatabaseService::new(path.clone()).expect("Failed to init db");

    // Verify WAL mode
    // We access tasks_db which is pub(crate) - access allowed since we are in mod tests inside db mod
    let mode: String = service.tasks_db.query_row("PRAGMA journal_mode", [], |row| row.get(0)).unwrap();
    assert_eq!(mode.to_uppercase(), "WAL", "TASKS_DB should be in WAL mode");

    let mode_learning: String = service.learning_db.query_row("PRAGMA journal_mode", [], |row| row.get(0)).unwrap();
    assert_eq!(mode_learning.to_uppercase(), "WAL", "LEARNING_DB should be in WAL mode");

    let mode_activity: String = service.activity_db.query_row("PRAGMA journal_mode", [], |row| row.get(0)).unwrap();
    assert_eq!(mode_activity.to_uppercase(), "WAL", "ACTIVITY_DB should be in WAL mode");

    // Verify Seed Idempotency
    let (l, t, a) = service.initialize_with_seed_data().expect("First seed failed");
    println!("Seeded: L={}, T={}, A={}", l, t, a);

    let (l2, t2, a2) = service.initialize_with_seed_data().expect("Second seed failed");
    println!("Second Seed: L={}, T={}, A={}", l2, t2, a2);

    // Counts should be 0 because data exists
    assert_eq!(l2, 0);
    assert_eq!(t2, 0);
    assert_eq!(a2, 0);

    // Check health
    assert!(service.health_check().is_ok());
}
