//! Database migration utilities for schema version management
//! Ensures smooth upgrades when database schema changes

use rusqlite::{Connection, Result as SqliteResult};
use tracing::{info, warn};

const CURRENT_SCHEMA_VERSION: i32 = 1;

/// Check and apply database migrations if needed
pub fn migrate_database(conn: &Connection, db_name: &str) -> SqliteResult<()> {
    // Create schema_version table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (
            db_name TEXT PRIMARY KEY,
            version INTEGER NOT NULL,
            migrated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Get current version
    let current_version = get_schema_version(conn, db_name)?;

    if current_version == CURRENT_SCHEMA_VERSION {
        info!(
            "{} database schema is up to date (v{})",
            db_name, current_version
        );
        return Ok(());
    }

    if current_version > CURRENT_SCHEMA_VERSION {
        warn!(
            "{} database schema version ({}) is newer than expected ({}). Skipping migration.",
            db_name, current_version, CURRENT_SCHEMA_VERSION
        );
        return Ok(());
    }

    info!(
        "Migrating {} database from v{} to v{}",
        db_name, current_version, CURRENT_SCHEMA_VERSION
    );

    // Apply migrations sequentially
    for version in (current_version + 1)..=CURRENT_SCHEMA_VERSION {
        apply_migration(conn, db_name, version)?;
    }

    Ok(())
}

fn get_schema_version(conn: &Connection, db_name: &str) -> SqliteResult<i32> {
    let version = conn
        .query_row(
            "SELECT version FROM schema_version WHERE db_name = ?1",
            [db_name],
            |row| row.get::<_, i32>(0),
        )
        .unwrap_or(0); // Default to version 0 if not found

    Ok(version)
}

fn apply_migration(conn: &Connection, db_name: &str, version: i32) -> SqliteResult<()> {
    info!("Applying migration v{} for {}", version, db_name);

    match (db_name, version) {
        ("activity", 1) => migrate_activity_v1(conn)?,
        _ => {
            warn!("No migration defined for {} v{}", db_name, version);
            return Ok(());
        }
    }

    // Update schema version
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT OR REPLACE INTO schema_version (db_name, version, migrated_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![db_name, version, now],
    )?;

    info!(
        "Migration v{} for {} completed successfully",
        version, db_name
    );
    Ok(())
}

/// Migration v0 -> v1 for activity database
/// Ensures deep_work_sessions table has all required columns
fn migrate_activity_v1(conn: &Connection) -> SqliteResult<()> {
    // Check if deep_work_sessions table exists
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='deep_work_sessions'",
            [],
            |row| row.get::<_, i32>(0),
        )
        .map(|count| count > 0)
        .unwrap_or(false);

    if !table_exists {
        // Table doesn't exist, it will be created with the correct schema
        info!("deep_work_sessions table doesn't exist, will be created with correct schema");
        return Ok(());
    }

    // Check if app_name column exists
    let has_app_name = check_column_exists(conn, "deep_work_sessions", "app_name")?;

    if has_app_name {
        info!("deep_work_sessions table already has app_name column");
        return Ok(());
    }

    info!("Migrating deep_work_sessions table to add app_name column");

    // SQLite doesn't support ALTER TABLE ADD COLUMN with NOT NULL and no default
    // We need to recreate the table
    conn.execute(
        "CREATE TABLE deep_work_sessions_new (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name    TEXT NOT NULL,
            window_title TEXT NOT NULL,
            process_id  INTEGER NOT NULL,
            start_ts    INTEGER NOT NULL,
            end_ts      INTEGER,
            created_at  INTEGER NOT NULL
        )",
        [],
    )?;

    // Copy data from old table (if it has compatible structure)
    // Since the old table doesn't have app_name, we'll use a placeholder
    let copy_result = conn.execute(
        "INSERT INTO deep_work_sessions_new (id, app_name, window_title, process_id, start_ts, end_ts, created_at)
         SELECT id, 'unknown', window_title, process_id, start_ts, end_ts, created_at
         FROM deep_work_sessions",
        [],
    );

    if let Err(e) = copy_result {
        warn!(
            "Could not copy old deep_work_sessions data: {}. Creating fresh table.",
            e
        );
    }

    // Drop old table and rename new one
    conn.execute("DROP TABLE IF EXISTS deep_work_sessions", [])?;
    conn.execute(
        "ALTER TABLE deep_work_sessions_new RENAME TO deep_work_sessions",
        [],
    )?;

    // Recreate indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_start_ts ON deep_work_sessions(start_ts)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_end_ts ON deep_work_sessions(end_ts)",
        [],
    )?;

    info!("deep_work_sessions table migration completed");
    Ok(())
}

fn check_column_exists(
    conn: &Connection,
    table_name: &str,
    column_name: &str,
) -> SqliteResult<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
    let column_exists = stmt
        .query_map([], |row| row.get::<_, String>(1))? // Column 1 is the column name
        .filter_map(|name| name.ok())
        .any(|name| name == column_name);

    Ok(column_exists)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_schema_version_tracking() {
        let conn = Connection::open_in_memory().unwrap();

        // Initialize schema_version table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                db_name TEXT PRIMARY KEY,
                version INTEGER NOT NULL,
                migrated_at INTEGER NOT NULL
            )",
            [],
        )
        .unwrap();

        // Test initial version (0)
        let version = get_schema_version(&conn, "test_db").unwrap();
        assert_eq!(version, 0);

        // Set version to 1
        let now = 1234567890;
        conn.execute(
            "INSERT INTO schema_version (db_name, version, migrated_at) VALUES (?1, ?2, ?3)",
            rusqlite::params!["test_db", 1, now],
        )
        .unwrap();

        // Test updated version
        let version = get_schema_version(&conn, "test_db").unwrap();
        assert_eq!(version, 1);
    }

    #[test]
    fn test_column_detection() {
        let conn = Connection::open_in_memory().unwrap();

        conn.execute(
            "CREATE TABLE test_table (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            )",
            [],
        )
        .unwrap();

        assert!(check_column_exists(&conn, "test_table", "id").unwrap());
        assert!(check_column_exists(&conn, "test_table", "name").unwrap());
        assert!(!check_column_exists(&conn, "test_table", "nonexistent").unwrap());
    }
}
