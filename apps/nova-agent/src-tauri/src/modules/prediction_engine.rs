#![allow(dead_code, unused_imports)]

pub(crate) mod commands;
mod duration;
mod insights;
mod recommendations;
mod risk;
mod timing;
mod types;

use rusqlite::Connection;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use tracing::{debug, info};

pub use commands::{
    assess_commit_risk_command, get_proactive_recommendations, get_productivity_insights,
    get_task_prediction, recommend_task_timing_command,
};
pub use types::{PredictionResult, ProductivityInsights, Recommendation, RiskLevel, TimeWindow};

pub struct PredictionEngine {
    learning_db: Arc<Mutex<Connection>>,
    prediction_cache: Arc<Mutex<HashMap<String, (PredictionResult, SystemTime)>>>,
    cache_duration: Duration,
}

impl PredictionEngine {
    /// Create new prediction engine with database connection
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open learning database: {}", e))?;

        // Enable WAL mode for better concurrency.
        let _ = conn.query_row("PRAGMA journal_mode=WAL", [], |_| {
            Ok::<(), rusqlite::Error>(())
        });
        let _ = conn.query_row("PRAGMA busy_timeout=5000", [], |_| {
            Ok::<(), rusqlite::Error>(())
        });

        let engine = Self {
            learning_db: Arc::new(Mutex::new(conn)),
            prediction_cache: Arc::new(Mutex::new(HashMap::new())),
            cache_duration: Duration::from_secs(300),
        };

        engine.init_tables()?;

        info!("PredictionEngine initialized successfully");
        Ok(engine)
    }

    /// Initialize database tables for recommendations and accuracy tracking
    fn init_tables(&self) -> Result<(), String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.execute(
            "CREATE TABLE IF NOT EXISTS proactive_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                action_label TEXT NOT NULL,
                action_command TEXT NOT NULL,
                confidence REAL,
                estimated_impact TEXT,
                executed INTEGER DEFAULT 0,
                dismissed INTEGER DEFAULT 0,
                metadata TEXT
            )",
            [],
        )
        .map_err(|e| format!("Failed to create proactive_recommendations table: {}", e))?;

        db.execute(
            "CREATE TABLE IF NOT EXISTS prediction_accuracy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_id INTEGER NOT NULL,
                predicted_value REAL NOT NULL,
                actual_value REAL NOT NULL,
                error_percentage REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY (prediction_id) REFERENCES proactive_recommendations(id)
            )",
            [],
        )
        .map_err(|e| format!("Failed to create prediction_accuracy table: {}", e))?;

        debug!("Prediction engine tables initialized");
        Ok(())
    }
}
