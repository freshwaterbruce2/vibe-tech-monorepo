use crate::database::connection::DatabaseService;
use crate::database::errors::DatabaseError;
use crate::database::types::{with_retry, Activity, FocusState};
use rusqlite::params;

impl DatabaseService {
    // Activity database methods
    pub fn create_activity_table(&self) -> rusqlite::Result<()> {
        self.activity_db.execute(
            "CREATE TABLE IF NOT EXISTS activity_events (
                 id          INTEGER PRIMARY KEY AUTOINCREMENT,
                 event_type  TEXT NOT NULL,
                 app_source  TEXT NOT NULL DEFAULT 'nova' CHECK (app_source IN ('nova', 'vibe')),
                 project_id  TEXT,
                 payload     TEXT,
                 created_at  INTEGER NOT NULL
             )",
            [],
        )?;

        self.activity_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type)",
            [],
        )?;
        self.activity_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_activity_events_app_source ON activity_events(app_source)",
            [],
        )?;
        self.activity_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON activity_events(created_at)",
            [],
        )?;

        Ok(())
    }

    pub fn create_focus_state_table(&self) -> rusqlite::Result<()> {
        self.activity_db.execute(
            "CREATE TABLE IF NOT EXISTS focus_state (
                 id              INTEGER PRIMARY KEY CHECK (id = 1),
                 last_seen       INTEGER NOT NULL,
                 focus_started_at INTEGER NOT NULL,
                 process_name    TEXT NOT NULL,
                 window_title    TEXT NOT NULL,
                 process_id      INTEGER NOT NULL
             )",
            [],
        )?;
        Ok(())
    }

    pub fn upsert_focus_state(
        &self,
        last_seen: i64,
        focus_started_at: i64,
        process_name: &str,
        window_title: &str,
        process_id: i64,
    ) -> rusqlite::Result<()> {
        self.activity_db.execute(
            "\
            INSERT INTO focus_state (
                id, last_seen, focus_started_at, process_name, window_title, process_id
            ) VALUES (
                1, ?1, ?2, ?3, ?4, ?5
            )
            ON CONFLICT(id) DO UPDATE SET
                last_seen = excluded.last_seen,
                focus_started_at = excluded.focus_started_at,
                process_name = excluded.process_name,
                window_title = excluded.window_title,
                process_id = excluded.process_id",
            params![last_seen, focus_started_at, process_name, window_title, process_id],
        )?;
        Ok(())
    }

    pub fn get_focus_state(&self) -> rusqlite::Result<Option<FocusState>> {
        let mut stmt = self.activity_db.prepare(
            "SELECT last_seen, focus_started_at, process_name, window_title, process_id FROM focus_state WHERE id = 1",
        )?;

        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            Ok(Some(FocusState {
                last_seen: row.get(0)?,
                focus_started_at: row.get(1)?,
                process_name: row.get(2)?,
                window_title: row.get(3)?,
                process_id: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn create_deep_work_sessions_table(&self) -> rusqlite::Result<()> {
        self.activity_db.execute(
            "CREATE TABLE IF NOT EXISTS deep_work_sessions (
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
        self.activity_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_start_ts ON deep_work_sessions(start_ts)",
            [],
        )?;
        self.activity_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_deep_work_sessions_end_ts ON deep_work_sessions(end_ts)",
            [],
        )?;
        Ok(())
    }

    pub fn start_deep_work_session(
        &self,
        app_name: &str,
        window_title: &str,
        process_id: i64,
        start_ts: i64,
    ) -> rusqlite::Result<i64> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.activity_db.execute(
            "INSERT INTO deep_work_sessions (app_name, window_title, process_id, start_ts, end_ts, created_at)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5)",
            params![app_name, window_title, process_id, start_ts, now],
        )?;

        Ok(self.activity_db.last_insert_rowid())
    }

    pub fn end_deep_work_session(&self, session_id: i64, end_ts: i64) -> rusqlite::Result<()> {
        self.activity_db.execute(
            "UPDATE deep_work_sessions SET end_ts = ?1 WHERE id = ?2 AND end_ts IS NULL",
            params![end_ts, session_id],
        )?;
        Ok(())
    }

    pub fn log_activity(&self, activity_type: &str, details: &str) -> rusqlite::Result<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.activity_db.execute(
            "INSERT INTO activity_events (event_type, app_source, payload, created_at) VALUES (?1, 'nova', ?2, ?3)",
            params![activity_type, details, now],
        )?;
        Ok(())
    }

    /// Get recent activities with optional limit
    pub fn get_recent_activities(
        &self,
        limit: Option<u32>,
        activity_type_filter: Option<&str>,
    ) -> rusqlite::Result<Vec<Activity>> {
        let limit = limit.unwrap_or(50);

        let mut query = String::from(
            "SELECT id, created_at, event_type, payload, project_id FROM activity_events",
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(act_type) = activity_type_filter {
            query.push_str(" WHERE event_type = ?");
            params_vec.push(Box::new(act_type.to_string()));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT ?");
        params_vec.push(Box::new(limit));

        let mut stmt = self.activity_db.prepare(&query)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let activity_iter = stmt.query_map(params_refs.as_slice(), |row| {
            // Map activity_events columns to Activity struct
            Ok(Activity {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                activity_type: row.get(2)?,
                details: row.get(3)?,
                metadata: None, // metadata removed from canonical
            })
        })?;

        let mut activities = Vec::new();
        for activity in activity_iter {
            activities.push(activity?);
        }
        Ok(activities)
    }

    /// Get activities within a time range
    pub fn get_activities_in_range(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> rusqlite::Result<Vec<Activity>> {
        let mut stmt = self.activity_db.prepare(
            "SELECT id, created_at, event_type, payload FROM activity_events WHERE created_at >= ?1 AND created_at <= ?2 ORDER BY created_at DESC"
        )?;

        let activity_iter = stmt.query_map(params![start_timestamp, end_timestamp], |row| {
            Ok(Activity {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                activity_type: row.get(2)?,
                details: row.get(3)?,
                metadata: None,
            })
        })?;

        let mut activities = Vec::new();
        for activity in activity_iter {
            activities.push(activity?);
        }
        Ok(activities)
    }

    /// Get activity count for today (deep work tracking)
    pub fn get_today_activity_count(&self) -> rusqlite::Result<i64> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Start of today (midnight UTC)
        let today_start = now - (now % 86400);

        let count: i64 = self.activity_db.query_row(
            "SELECT COUNT(*) FROM activity_events WHERE created_at >= ?1",
            params![today_start],
            |row| row.get(0),
        )?;

        Ok(count)
    }

    /// Sum deep work minutes in the last 24 hours based on deep_work events
    pub fn get_deep_work_minutes_24h(&self) -> rusqlite::Result<u32> {
        let query = "\
            SELECT start_ts, COALESCE(end_ts, ?2) AS end_ts\n\
            FROM deep_work_sessions\n\
            WHERE start_ts <= ?2 AND (end_ts IS NULL OR end_ts >= ?1)";

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let since = now - 86_400;

        let mut stmt = match self.activity_db.prepare(query) {
            Ok(stmt) => stmt,
            Err(_) => return self.get_deep_work_minutes_24h_legacy(since),
        };

        let rows = stmt.query_map(params![since, now], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
        })?;
        let mut total_secs: i64 = 0;

        for row in rows {
            let (start_ts, end_ts) = row?;
            let start_ts = start_ts.max(since);
            let end_ts = end_ts.min(now);
            if end_ts > start_ts {
                total_secs = total_secs.saturating_add(end_ts - start_ts);
            }
        }

        Ok((total_secs / 60) as u32)
    }

    fn get_deep_work_minutes_24h_legacy(&self, since: i64) -> rusqlite::Result<u32> {
        let mut stmt = self.activity_db.prepare(
            "SELECT payload FROM activity_events WHERE event_type = 'deep_work' AND created_at >= ?1",
        )?;

        let rows = stmt.query_map(params![since], |row| row.get::<_, String>(0))?;
        let mut minutes: u32 = 0;

        for row in rows {
            if let Ok(payload) = row {
                // Expected format: deep_work|app|minutes
                if let Some(last) = payload.split('|').last() {
                    if let Ok(parsed) = last.trim().parse::<u32>() {
                        minutes = minutes.saturating_add(parsed);
                    }
                }
            }
        }

        Ok(minutes)
    }

    // ============================================
    // SAFE RETRY METHODS
    // ============================================

    /// Get recent activities with automatic retry
    #[allow(dead_code)]
    pub fn get_recent_activities_safe(
        &self,
        limit: Option<u32>,
        activity_type_filter: Option<String>,
    ) -> Result<Vec<Activity>, DatabaseError> {
        let config = self.retry_config.clone();
        with_retry(&config, "get_recent_activities", || {
            self.get_recent_activities(limit, activity_type_filter.as_deref())
                .map_err(DatabaseError::from)
        })
    }

    /// Get today's activity count with automatic retry
    #[allow(dead_code)]
    pub fn get_today_activity_count_safe(&self) -> Result<i64, DatabaseError> {
        let config = self.retry_config.clone();
        with_retry(&config, "get_today_activity_count", || {
            self.get_today_activity_count().map_err(DatabaseError::from)
        })
    }

    /// Log activity with automatic retry
    #[allow(dead_code)]
    pub fn log_activity_safe(
        &self,
        activity_type: &str,
        details: &str,
    ) -> Result<(), DatabaseError> {
        let config = self.retry_config.clone();
        let activity_type = activity_type.to_string();
        let details = details.to_string();
        with_retry(&config, "log_activity", || {
            self.log_activity(&activity_type, &details)
                .map_err(DatabaseError::from)
        })
    }
}
