use crate::database::connection::DatabaseService;
use crate::database::errors::DatabaseError;
use crate::database::types::{Task, with_retry};
use rusqlite::params;

impl DatabaseService {
    // Task database methods
    pub fn create_task_table(&self) -> rusqlite::Result<()> {
        self.tasks_db.execute(
            "CREATE TABLE IF NOT EXISTS task_tasks (
                 id          TEXT PRIMARY KEY,
                 title       TEXT NOT NULL,
                 description TEXT,
                 status      TEXT NOT NULL,
                 priority    TEXT NOT NULL DEFAULT 'normal',
                 due_at      INTEGER,
                 app_source  TEXT NOT NULL DEFAULT 'nova' CHECK (app_source IN ('nova', 'vibe')),
                 created_at  INTEGER NOT NULL,
                 updated_at  INTEGER,
                 metadata    TEXT
             )",
            [],
        )?;

        self.tasks_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_tasks_status ON task_tasks(status)",
            [],
        )?;
        self.tasks_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_task_tasks_app_source ON task_tasks(app_source)",
            [],
        )?;
        Ok(())
    }

    pub fn log_task(&self, task_id: &str, title: &str, status: &str) -> rusqlite::Result<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.tasks_db.execute(
            "INSERT OR REPLACE INTO task_tasks (id, title, status, priority, app_source, created_at, updated_at) VALUES (?1, ?2, ?3, 'normal', 'nova', ?4, ?5)",
            params![task_id, title, status, now, now],
        )?;
        Ok(())
    }

    /// Get all tasks, optionally filtered by status
    pub fn get_tasks(
        &self,
        status_filter: Option<&str>,
        limit: Option<u32>,
    ) -> rusqlite::Result<Vec<Task>> {
        let limit = limit.unwrap_or(100);

        // We use query mapping to ensure parameters work with rusqlite
        // Option 1: Safe positional params building string
        let mut query = String::from("SELECT id, title, status, created_at, COALESCE(updated_at, created_at), metadata FROM task_tasks");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(status) = status_filter {
            query.push_str(" WHERE status = ?");
            params_vec.push(Box::new(status.to_string()));
        }

        query.push_str(" ORDER BY created_at DESC LIMIT ?");
        params_vec.push(Box::new(limit));

        let mut stmt = self.tasks_db.prepare(&query)?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let task_iter = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                metadata: row.get(5)?,
            })
        })?;

        let mut tasks = Vec::new();
        for task in task_iter {
            tasks.push(task?);
        }
        Ok(tasks)
    }

    /// Get a single task by ID
    pub fn get_task_by_id(&self, task_id: &str) -> rusqlite::Result<Option<Task>> {
        let mut stmt = self.tasks_db.prepare(
            "SELECT id, title, status, created_at, COALESCE(updated_at, created_at), metadata FROM task_tasks WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![task_id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                metadata: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Update task status
    pub fn update_task_status(&self, task_id: &str, new_status: &str) -> rusqlite::Result<bool> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let rows_affected = self.tasks_db.execute(
            "UPDATE task_tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_status, now, task_id],
        )?;

        Ok(rows_affected > 0)
    }

    /// Create a new task with duplicate detection
    /// Returns Ok(task_id) if created, Err with existing task_id if duplicate found
    pub fn create_task(
        &self,
        title: &str,
        description: Option<&str>,
        priority: &str,
        tags: Option<&[String]>,
        parent_task_id: Option<&str>,
        estimated_minutes: Option<i32>,
        extra_metadata: Option<serde_json::Value>,
    ) -> Result<String, DatabaseError> {
        // Check for duplicates first (title similarity > 80%)
        if let Some(existing) = self.find_duplicate_task(title)? {
            return Err(DatabaseError::DuplicateTask(existing.id));
        }

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let task_id = uuid::Uuid::new_v4().to_string();
        let _tags_json = tags.map(|t| serde_json::to_string(t).ok()).flatten();
        
        let mut metadata = serde_json::json!({
            "parent_task_id": parent_task_id,
            "estimated_minutes": estimated_minutes,
            "tags": tags,
        });

        if let Some(extra) = extra_metadata {
            match (&mut metadata, extra) {
                (serde_json::Value::Object(base), serde_json::Value::Object(extra_map)) => {
                    for (key, value) in extra_map {
                        base.insert(key, value);
                    }
                }
                (base, value) => {
                    *base = serde_json::json!({
                        "base": base.clone(),
                        "extra": value,
                    });
                }
            }
        }

        self.tasks_db.execute(
            "INSERT INTO task_tasks (id, title, description, status, priority, app_source, created_at, updated_at, metadata)
             VALUES (?1, ?2, ?3, 'pending', ?4, 'nova', ?5, ?5, ?6)",
            params![task_id, title, description, priority, now, metadata.to_string()],
        )?;

        Ok(task_id)
    }

    /// Find duplicate task by title similarity
    fn find_duplicate_task(&self, title: &str) -> Result<Option<Task>, DatabaseError> {
        // Get recent non-archived tasks
        let mut stmt = self.tasks_db.prepare(
            "SELECT id, title, status, created_at, COALESCE(updated_at, created_at), metadata 
             FROM task_tasks 
             WHERE status NOT IN ('completed', 'archived')
             ORDER BY created_at DESC 
             LIMIT 100"
        )?;

        let task_iter = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                metadata: row.get(5)?,
            })
        })?;

        let title_lower = title.to_lowercase();
        let title_words: std::collections::HashSet<_> = title_lower.split_whitespace().collect();

        for task_result in task_iter {
            let task = task_result?;
            let existing_lower = task.title.to_lowercase();
            let existing_words: std::collections::HashSet<_> = existing_lower.split_whitespace().collect();

            // Calculate Jaccard similarity
            let intersection = title_words.intersection(&existing_words).count();
            let union = title_words.union(&existing_words).count();
            let similarity = if union > 0 { intersection as f32 / union as f32 } else { 0.0 };

            if similarity >= 0.8 {
                return Ok(Some(task));
            }
        }

        Ok(None)
    }

    /// Get task statistics (count by status)
    pub fn get_task_stats(&self) -> rusqlite::Result<std::collections::HashMap<String, i64>> {
        let mut stmt = self
            .tasks_db
            .prepare("SELECT status, COUNT(*) FROM task_tasks GROUP BY status")?;

        let mut stats = std::collections::HashMap::new();
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        for row in rows {
            let (status, count) = row?;
            stats.insert(status, count);
        }
        Ok(stats)
    }

    // ============================================
    // SAFE RETRY METHODS
    // ============================================

    /// Get tasks with automatic retry on transient failures
    #[allow(dead_code)]
    pub fn get_tasks_safe(
        &self,
        status_filter: Option<String>,
        limit: Option<u32>,
    ) -> Result<Vec<Task>, DatabaseError> {
        let config = self.retry_config.clone();
        with_retry(&config, "get_tasks", || {
            self.get_tasks(status_filter.as_deref(), limit)
                .map_err(DatabaseError::from)
        })
    }

    /// Get task by ID with automatic retry
    #[allow(dead_code)]
    pub fn get_task_by_id_safe(&self, task_id: &str) -> Result<Option<Task>, DatabaseError> {
        let config = self.retry_config.clone();
        let task_id = task_id.to_string();
        with_retry(&config, "get_task_by_id", || {
            self.get_task_by_id(&task_id).map_err(DatabaseError::from)
        })
    }

    /// Update task status with automatic retry
    #[allow(dead_code)]
    pub fn update_task_status_safe(
        &self,
        task_id: &str,
        new_status: &str,
    ) -> Result<bool, DatabaseError> {
        let config = self.retry_config.clone();
        let task_id = task_id.to_string();
        let new_status = new_status.to_string();
        with_retry(&config, "update_task_status", || {
            self.update_task_status(&task_id, &new_status)
                .map_err(DatabaseError::from)
        })
    }

    /// Get task stats with automatic retry
    #[allow(dead_code)]
    pub fn get_task_stats_safe(
        &self,
    ) -> Result<std::collections::HashMap<String, i64>, DatabaseError> {
        let config = self.retry_config.clone();
        with_retry(&config, "get_task_stats", || {
            self.get_task_stats().map_err(DatabaseError::from)
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::database::connection::DatabaseService;
    use tempfile::tempdir;

    #[test]
    fn create_task_merges_security_metadata() {
        let dir = tempdir().unwrap();
        let service = DatabaseService::new(dir.path().to_path_buf()).unwrap();
        service.create_task_table().unwrap();

        let task_id = service
            .create_task(
                "Security Test",
                Some("desc"),
                "high",
                None,
                None,
                Some(30),
                Some(serde_json::json!({
                    "project_path": "C:\\dev\\apps\\nova-agent",
                    "auto_execute": false,
                    "requires_approval": true,
                })),
            )
            .unwrap();

        let task = service.get_task_by_id(&task_id).unwrap().unwrap();
        let metadata: serde_json::Value =
            serde_json::from_str(task.metadata.as_deref().unwrap()).unwrap();

        assert_eq!(metadata["project_path"], "C:\\dev\\apps\\nova-agent");
        assert_eq!(metadata["auto_execute"], false);
        assert_eq!(metadata["requires_approval"], true);
        assert_eq!(metadata["estimated_minutes"], 30);
    }
}
