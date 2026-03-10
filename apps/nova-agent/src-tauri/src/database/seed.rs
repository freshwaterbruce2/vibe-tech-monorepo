use crate::database::connection::DatabaseService;
use rusqlite::params;
use tracing::info;

impl DatabaseService {
    // ============================================
    // SEED DATA INITIALIZATION
    // ============================================

    /// Initialize learning database with seed data for pattern recognition
    /// Returns the number of events inserted (0 if already seeded)
    pub fn seed_learning_data(&self) -> rusqlite::Result<usize> {
        // Check if we already have seed data
        let existing_count: i64 =
            self.learning_db
                .query_row("SELECT COUNT(*) FROM learning_events", [], |row| row.get(0))?;

        if existing_count > 0 {
            info!(
                "Learning database already has {} events, skipping seed",
                existing_count
            );
            return Ok(0);
        }

        info!("Seeding learning database with initial patterns...");

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Seed data for pattern recognition - events spread over past 7 days
        let seed_events = vec![
            // Code quality patterns (successes)
            (
                "code_review",
                "TypeScript refactoring in nova-agent",
                "success",
                r#"{"files": 5, "language": "typescript"}"#,
                now - 86400 * 6,
            ),
            (
                "build_success",
                "Cargo build completed for nova-agent",
                "success",
                r#"{"duration_ms": 12500, "warnings": 3}"#,
                now - 86400 * 5,
            ),
            (
                "test_pass",
                "All 15 unit tests passed",
                "success",
                r#"{"test_count": 15, "duration_ms": 2300}"#,
                now - 86400 * 5,
            ),
            // Learning from failures
            (
                "build_failure",
                "Missing import in websocket_client.rs",
                "failure",
                r#"{"error": "unresolved import", "file": "websocket_client.rs"}"#,
                now - 86400 * 4,
            ),
            (
                "fix_applied",
                "Added use statement for tokio::sync",
                "success",
                r#"{"fix_type": "import", "time_to_fix_ms": 45000}"#,
                now - 86400 * 4,
            ),
            // Git workflow patterns
            (
                "commit_pattern",
                "Small focused commit: 3 files",
                "success",
                r#"{"file_count": 3, "type": "feature"}"#,
                now - 86400 * 3,
            ),
            (
                "commit_pattern",
                "Large commit: 12 files",
                "warning",
                r#"{"file_count": 12, "type": "refactor", "recommendation": "split into smaller commits"}"#,
                now - 86400 * 3,
            ),
            // Deep work patterns
            (
                "deep_work_session",
                "90 minutes focused coding",
                "success",
                r#"{"duration_minutes": 90, "interruptions": 0, "project": "nova-agent"}"#,
                now - 86400 * 2,
            ),
            (
                "context_switch",
                "Switched between 4 projects in 1 hour",
                "warning",
                r#"{"project_count": 4, "recommendation": "reduce context switching"}"#,
                now - 86400 * 2,
            ),
            // Project creation patterns
            (
                "project_create",
                "Created nx-react app successfully",
                "success",
                r#"{"template": "nx-react", "name": "my-dashboard"}"#,
                now - 86400 * 1,
            ),
            (
                "project_create",
                "Created rust-lib with custom config",
                "success",
                r#"{"template": "rust-lib", "name": "shared-utils"}"#,
                now - 86400 * 1,
            ),
            // Error recovery patterns
            (
                "error_recovery",
                "WebSocket reconnection after network drop",
                "success",
                r#"{"reconnect_attempts": 2, "downtime_ms": 5200}"#,
                now - 3600 * 12,
            ),
            (
                "database_recovery",
                "WAL checkpoint after crash recovery",
                "success",
                r#"{"database": "agent_tasks.db", "records_recovered": 42}"#,
                now - 3600 * 6,
            ),
            // Recent activity for UI display
            (
                "code_edit",
                "Modified guidance_engine.rs",
                "success",
                r#"{"lines_changed": 45, "file": "guidance_engine.rs"}"#,
                now - 3600 * 2,
            ),
            (
                "guidance_generated",
                "Generated 3 next steps, 2 doing right, 1 at risk",
                "success",
                r#"{"next_steps": 3, "doing_right": 2, "at_risk": 1}"#,
                now - 3600,
            ),
        ];

        let mut inserted = 0;
        for (event_type, context, outcome, metadata, timestamp) in seed_events {
            self.learning_db.execute(
                "INSERT INTO learning_events (title, description, outcome, app_source, created_at, metadata) VALUES (?1, ?2, ?3, 'nova', ?4, ?5)",
                params![event_type, context, outcome, timestamp, metadata],
            )?;
            inserted += 1;
        }

        info!("Seeded learning database with {} events", inserted);
        Ok(inserted)
    }

    /// Initialize tasks database with sample tasks for demo/testing
    /// Returns the number of tasks inserted (0 if already has tasks)
    pub fn seed_task_data(&self) -> rusqlite::Result<usize> {
        // Check if we already have tasks
        let existing_count: i64 =
            self.tasks_db
                .query_row("SELECT COUNT(*) FROM task_tasks", [], |row| row.get(0))?;

        if existing_count > 0 {
            info!(
                "Tasks database already has {} tasks, skipping seed",
                existing_count
            );
            return Ok(0);
        }

        info!("Seeding tasks database with sample tasks...");

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let seed_tasks = vec![
            (
                "task-001",
                "Complete WebSocket reconnection testing",
                "in-progress",
                now - 86400 * 2,
            ),
            (
                "task-002",
                "Add retry logic to database operations",
                "pending",
                now - 86400,
            ),
            (
                "task-003",
                "Implement E2E test suite",
                "pending",
                now - 86400,
            ),
            (
                "task-004",
                "Fix unused code warnings",
                "completed",
                now - 86400 * 3,
            ),
            (
                "task-005",
                "Update PHASE_STATUS.md documentation",
                "completed",
                now - 3600,
            ),
        ];

        let mut inserted = 0;
        for (id, title, status, created_at) in seed_tasks {
            self.tasks_db.execute(
                "INSERT INTO task_tasks (id, title, status, priority, app_source, created_at, updated_at) VALUES (?1, ?2, ?3, 'normal', 'nova', ?4, ?5)",
                params![id, title, status, created_at, now],
            )?;
            inserted += 1;
        }

        info!("Seeded tasks database with {} tasks", inserted);
        Ok(inserted)
    }

    /// Initialize activity database with sample activities
    /// Returns the number of activities inserted (0 if already has activities)
    pub fn seed_activity_data(&self) -> rusqlite::Result<usize> {
        // Check if we already have activities
        let existing_count: i64 =
            self.activity_db
                .query_row("SELECT COUNT(*) FROM activity_events", [], |row| row.get(0))?;

        if existing_count > 0 {
            info!(
                "Activity database already has {} activities, skipping seed",
                existing_count
            );
            return Ok(0);
        }

        info!("Seeding activity database with sample activities...");

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let seed_activities = vec![
            ("file_open", "Opened database.rs", now - 3600 * 4),
            (
                "file_edit",
                "Modified database.rs - added seed functions",
                now - 3600 * 3,
            ),
            (
                "git_commit",
                "Committed: Add database read operations",
                now - 3600 * 2,
            ),
            ("file_open", "Opened guidance_engine.rs", now - 3600),
            (
                "deep_work_start",
                "Started focused coding session",
                now - 1800,
            ),
            ("file_save", "Saved main.rs", now - 900),
            ("build_trigger", "Triggered cargo build", now - 600),
            ("test_run", "Ran cargo test", now - 300),
        ];

        let mut inserted = 0;
        for (activity_type, details, timestamp) in seed_activities {
            self.activity_db.execute(
                "INSERT INTO activity_events (created_at, event_type, payload, app_source) VALUES (?1, ?2, ?3, 'nova')",
                params![timestamp, activity_type, details],
            )?;
            inserted += 1;
        }

        info!("Seeded activity database with {} activities", inserted);
        Ok(inserted)
    }

    /// Initialize all databases with seed data
    /// Call this on app startup to ensure databases have initial data
    pub fn initialize_with_seed_data(&self) -> rusqlite::Result<(usize, usize, usize)> {
        // First ensure tables exist
        self.create_task_table()?;
        self.create_activity_table()?;
        self.create_focus_state_table()?;
        self.create_deep_work_sessions_table()?;
        self.create_learning_table()?;
        
        // Initialize memory tables (uses DatabaseError, convert to rusqlite error)
        if let Err(e) = self.init_memory_tables() {
            tracing::error!("Failed to initialize memory tables: {:?}", e);
        }

        let seed_demo_data = std::env::var("NOVA_SEED_DEMO_DATA")
            .map(|v| v.trim() == "1")
            .unwrap_or(false);

        if !seed_demo_data {
            info!("Skipping demo seed data (set NOVA_SEED_DEMO_DATA=1 to enable)");
            return Ok((0, 0, 0));
        }

        // Then seed with initial data
        let learning_count = self.seed_learning_data()?;
        let task_count = self.seed_task_data()?;
        let activity_count = self.seed_activity_data()?;

        info!(
            "Database initialization complete: {} learning events, {} tasks, {} activities",
            learning_count, task_count, activity_count
        );

        Ok((learning_count, task_count, activity_count))
    }
}
