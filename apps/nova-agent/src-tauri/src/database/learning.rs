use crate::database::connection::DatabaseService;
use crate::database::errors::DatabaseError;
use crate::database::types::{with_retry, LearningEvent};
use rusqlite::params;

impl DatabaseService {
    // Learning database methods
    pub fn create_learning_table(&self) -> rusqlite::Result<()> {
        self.learning_db.execute(
            "CREATE TABLE IF NOT EXISTS learning_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT,
                app_source TEXT NOT NULL DEFAULT 'nova',
                project_id TEXT,
                session_id TEXT,
                timestamp INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                outcome TEXT,
                metadata TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER
            )",
            [],
        )?;
        Ok(())
    }

    pub fn log_learning_event(
        &self,
        event_type: &str,
        context: &str,
        outcome: &str,
    ) -> rusqlite::Result<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Insert a minimal record into the canonical learning_events schema.
        self.learning_db.execute(
            "INSERT INTO learning_events (
                event_type,
                app_source,
                project_id,
                session_id,
                timestamp,
                title,
                description,
                status,
                created_at,
                updated_at,
                outcome
            ) VALUES (
                ?1, 'nova', NULL, NULL, ?2, ?1, ?3, 'active', ?2, ?2, ?4
            )",
            params![event_type, now, context, outcome],
        )?;
        Ok(())
    }

    /// Log structured execution metrics to the unified agent_executions table
    #[allow(dead_code)]
    pub fn log_execution(
        &self,
        agent_name: &str,
        task_type: &str,
        success: bool,
        execution_time: f64,
        error_details: Option<&str>,
    ) -> rusqlite::Result<()> {
        // Ensure table exists (idempotent, though better in migration)
        let _ = self.learning_db.execute(
            "CREATE TABLE IF NOT EXISTS agent_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT NOT NULL,
                task_type TEXT,
                success BOOLEAN,
                execution_time REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_details TEXT
            )",
            [],
        );

        self.learning_db.execute(
            "INSERT INTO agent_executions (
                agent_name,
                task_type,
                success,
                execution_time,
                error_details
            ) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                agent_name,
                task_type,
                success,
                execution_time,
                error_details
            ],
        )?;
        Ok(())
    }

    /// Get learning events with optional limit and type filter
    pub fn get_learning_events(
        &self,
        limit: Option<u32>,
        event_type_filter: Option<&str>,
    ) -> rusqlite::Result<Vec<LearningEvent>> {
        let limit = limit.unwrap_or(50);

        let mut query = String::from(
            "SELECT id, created_at, title, description, outcome, metadata FROM learning_events",
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(evt_type) = event_type_filter {
            query.push_str(" WHERE outcome = ?"); // Assuming filter intends outcome
            params_vec.push(Box::new(evt_type.to_string()));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT ?");
        params_vec.push(Box::new(limit));

        let mut stmt = self.learning_db.prepare(&query)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let event_iter = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(LearningEvent {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event_type: row.get(2)?, // return title here
                context: row.get(3)?,
                outcome: row.get(4)?,
                metadata: row.get(5)?,
            })
        })?;

        let mut events = Vec::new();
        for event in event_iter {
            events.push(event?);
        }
        Ok(events)
    }

    /// Get learning events by outcome (success/failure patterns)
    pub fn get_learning_by_outcome(
        &self,
        outcome: &str,
        limit: Option<u32>,
    ) -> rusqlite::Result<Vec<LearningEvent>> {
        let limit = limit.unwrap_or(50);

        let mut stmt = self.learning_db.prepare(
            "SELECT id, created_at, title, description, outcome, metadata FROM learning_events WHERE outcome = ?1 ORDER BY created_at DESC LIMIT ?2"
        )?;

        let event_iter = stmt.query_map(params![outcome, limit], |row| {
            Ok(LearningEvent {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event_type: row.get(2)?,
                context: row.get(3)?,
                outcome: row.get(4)?,
                metadata: row.get(5)?,
            })
        })?;

        let mut events = Vec::new();
        for event in event_iter {
            events.push(event?);
        }
        Ok(events)
    }

    // ============================================
    // SAFE RETRY METHODS
    // ============================================

    /// Get learning events with automatic retry
    #[allow(dead_code)]
    pub fn get_learning_events_safe(
        &self,
        limit: Option<u32>,
        event_type_filter: Option<String>,
    ) -> Result<Vec<LearningEvent>, DatabaseError> {
        let config = self.retry_config.clone();
        with_retry(&config, "get_learning_events", || {
            self.get_learning_events(limit, event_type_filter.as_deref())
                .map_err(DatabaseError::from)
        })
    }

    /// Log learning event with automatic retry
    #[allow(dead_code)]
    pub fn log_learning_event_safe(
        &self,
        event_type: &str,
        context: &str,
        outcome: &str,
    ) -> Result<(), DatabaseError> {
        let config = self.retry_config.clone();
        let event_type = event_type.to_string();
        let context = context.to_string();
        let outcome = outcome.to_string();
        with_retry(&config, "log_learning_event", || {
            self.log_learning_event(&event_type, &context, &outcome)
                .map_err(DatabaseError::from)
        })
    }
}
