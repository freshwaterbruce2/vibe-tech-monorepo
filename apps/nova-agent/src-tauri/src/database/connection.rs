use crate::database::types::RetryConfig;
use rusqlite::Connection;
use std::path::PathBuf;
use tracing::info;

pub struct DatabaseService {
    pub(crate) tasks_db: Connection,
    pub(crate) learning_db: Connection,
    pub(crate) activity_db: Connection,
    pub(crate) retry_config: RetryConfig,
}

impl DatabaseService {
    pub fn new(base_path: PathBuf) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        Self::new_with_config(base_path, RetryConfig::default())
    }

    pub fn new_with_config(
        base_path: PathBuf,
        retry_config: RetryConfig,
    ) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing DatabaseService at {:?}", base_path);

        // Ensure directory exists
        #[cfg(not(test))]
        if !base_path
            .to_string_lossy()
            .to_string()
            .to_uppercase()
            .starts_with("D:\\")
        {
            return Err("Database path must be on D:\\ drive".into());
        }
        std::fs::create_dir_all(&base_path)?;

        // Connect to databases and enable WAL mode
        let tasks_db = Connection::open(base_path.join("agent_tasks.db"))?;
        let _ = tasks_db.query_row("PRAGMA journal_mode=WAL", [], |_| Ok(())); // Ignore result
        info!("Connected to agent_tasks.db with WAL mode");

        // Agent learning database is the shared learning store across Nova and Vibe
        let learning_db = Connection::open(base_path.join("agent_learning.db"))?;
        let _ = learning_db.query_row("PRAGMA journal_mode=WAL", [], |_| Ok(()));
        info!("Connected to agent_learning.db with WAL mode");

        let activity_db = Connection::open(base_path.join("nova_activity.db"))?;
        let _ = activity_db.query_row("PRAGMA journal_mode=WAL", [], |_| Ok(()));
        info!("Connected to nova_activity.db with WAL mode");

        Ok(Self {
            tasks_db,
            learning_db,
            activity_db,
            retry_config,
        })
    }

    /// Check if database service is healthy
    pub fn health_check(&self) -> Result<bool, crate::database::errors::DatabaseError> {
        // Simple query to verify all databases are accessible
        let _ = self.tasks_db.query_row("SELECT 1", [], |_| Ok(()))?;
        let _ = self.learning_db.query_row("SELECT 1", [], |_| Ok(()))?;
        let _ = self.activity_db.query_row("SELECT 1", [], |_| Ok(()))?;
        Ok(true)
    }
}
