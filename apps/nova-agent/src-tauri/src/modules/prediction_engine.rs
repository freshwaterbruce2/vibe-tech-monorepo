#![allow(dead_code)]
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{debug, info};

// ============================================
// Types & Structs
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionResult {
    pub estimated_duration: f64, // seconds
    pub confidence: f64,         // 0.0 to 1.0
    pub variance: f64,           // standard deviation
    pub sample_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductivityInsights {
    pub peak_hours: Vec<TimeWindow>,
    pub most_productive_day: String,
    pub average_focus_duration: f64, // minutes
    pub task_completion_rate: f64,   // percentage
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeWindow {
    pub start_hour: u8,          // 0-23
    pub end_hour: u8,            // 0-23
    pub productivity_score: f64, // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: i64,
    pub timestamp: i64,
    pub category: String,
    pub priority: String,
    pub title: String,
    pub description: String,
    pub action_label: String,
    pub action_command: String,
    pub confidence: f64,
    pub estimated_impact: String,
    pub executed: bool,
    pub dismissed: bool,
    pub metadata: Option<String>,
}

// ============================================
// Prediction Engine
// ============================================

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

        // Enable WAL mode for better concurrency (use query_row since PRAGMA returns result)
        let _ = conn.query_row("PRAGMA journal_mode=WAL", [], |_| {
            Ok::<(), rusqlite::Error>(())
        });
        let _ = conn.query_row("PRAGMA busy_timeout=5000", [], |_| {
            Ok::<(), rusqlite::Error>(())
        });

        let engine = Self {
            learning_db: Arc::new(Mutex::new(conn)),
            prediction_cache: Arc::new(Mutex::new(HashMap::new())),
            cache_duration: Duration::from_secs(300), // 5 minutes
        };

        // Initialize new tables
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

        // Proactive recommendations table
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

        // Prediction accuracy tracking
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

    /// Predict task completion duration based on historical data
    pub fn predict_task_duration(&self, task_type: &str) -> Result<PredictionResult, String> {
        // Check cache first
        let cache_key = format!("task_duration:{}", task_type);
        {
            let cache = self
                .prediction_cache
                .lock()
                .map_err(|e| format!("Failed to lock cache: {}", e))?;

            if let Some((result, cached_at)) = cache.get(&cache_key) {
                if cached_at.elapsed().unwrap_or(Duration::MAX) < self.cache_duration {
                    debug!("Returning cached prediction for task_type: {}", task_type);
                    return Ok(result.clone());
                }
            }
        }

        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        // Query similar task completions from last 30 days
        let mut stmt = db
            .prepare(
                "SELECT 
                    AVG(json_extract(metadata, '$.duration')) as avg_duration,
                    COUNT(*) as sample_size,
                    json_extract(metadata, '$.duration') as duration
                FROM learning_events
                WHERE title = ?1
                  AND outcome = 'success'
                  AND created_at > ?2
                  AND json_extract(metadata, '$.duration') IS NOT NULL
                GROUP BY 1",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let thirty_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (30 * 24 * 60 * 60);

        let rows: Result<Vec<(Option<f64>, usize)>, _> = stmt
            .query_map(params![task_type, thirty_days_ago], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| format!("Failed to query task durations: {}", e))?
            .collect();

        let rows = rows.map_err(|e| format!("Failed to process rows: {}", e))?;

        if rows.is_empty() || rows[0].0.is_none() {
            debug!("No historical data for task_type: {}", task_type);
            return Ok(PredictionResult {
                estimated_duration: 0.0,
                confidence: 0.0,
                variance: 0.0,
                sample_size: 0,
            });
        }

        let avg_duration = rows[0].0.unwrap_or(0.0);
        let sample_size = rows[0].1;

        // Calculate variance (standard deviation)
        let mut variance_stmt = db
            .prepare(
                "SELECT json_extract(metadata, '$.duration') as duration
                FROM learning_events
                WHERE title = ?1
                  AND outcome = 'success'
                  AND created_at > ?2
                  AND json_extract(metadata, '$.duration') IS NOT NULL",
            )
            .map_err(|e| format!("Failed to prepare variance query: {}", e))?;

        let durations: Vec<f64> = variance_stmt
            .query_map(params![task_type, thirty_days_ago], |row| row.get(0))
            .map_err(|e| format!("Failed to query durations: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        let variance = if durations.len() > 1 {
            let mean = avg_duration;
            let sum_sq_diff: f64 = durations.iter().map(|d| (d - mean).powi(2)).sum();
            (sum_sq_diff / (durations.len() - 1) as f64).sqrt()
        } else {
            0.0
        };

        // Calculate confidence (10+ samples = 100%)
        let confidence = (sample_size as f64 / 10.0).min(1.0);

        let result = PredictionResult {
            estimated_duration: avg_duration,
            confidence,
            variance,
            sample_size,
        };

        // Cache the result
        {
            let mut cache = self
                .prediction_cache
                .lock()
                .map_err(|e| format!("Failed to lock cache: {}", e))?;
            cache.insert(cache_key, (result.clone(), SystemTime::now()));
        }

        debug!(
            "Predicted duration for {}: {:.2}s (confidence: {:.0}%, variance: {:.2}s, samples: {})",
            task_type,
            result.estimated_duration,
            result.confidence * 100.0,
            result.variance,
            result.sample_size
        );

        Ok(result)
    }

    /// Analyze productivity patterns by hour and day
    pub fn get_productivity_insights(&self) -> Result<ProductivityInsights, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        // Analyze hourly productivity (tasks completed per hour)
        let mut hour_stmt = db
            .prepare(
                "SELECT 
                    strftime('%H', datetime(created_at, 'unixepoch')) as hour,
                    COUNT(*) as task_count
                FROM learning_events
                WHERE outcome = 'success'
                  AND created_at > ?1
                GROUP BY hour
                ORDER BY task_count DESC",
            )
            .map_err(|e| format!("Failed to prepare hourly query: {}", e))?;

        let seven_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (7 * 24 * 60 * 60);

        let hourly_data: Vec<(u8, usize)> = hour_stmt
            .query_map(params![seven_days_ago], |row| {
                let hour_str: String = row.get(0)?;
                let hour = hour_str.parse::<u8>().unwrap_or(0);
                let count: usize = row.get(1)?;
                Ok((hour, count))
            })
            .map_err(|e| format!("Failed to query hourly data: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        // Find peak productivity hours (top 3)
        let max_count = hourly_data.iter().map(|(_, c)| *c).max().unwrap_or(1);
        let peak_hours: Vec<TimeWindow> = hourly_data
            .iter()
            .take(3)
            .map(|(hour, count)| TimeWindow {
                start_hour: *hour,
                end_hour: (hour + 1) % 24,
                productivity_score: (*count as f64) / (max_count as f64),
            })
            .collect();

        // Analyze day-of-week productivity
        let mut day_stmt = db
            .prepare(
                "SELECT 
                    strftime('%w', datetime(created_at, 'unixepoch')) as day,
                    COUNT(*) as task_count
                FROM learning_events
                WHERE outcome = 'success'
                  AND created_at > ?1
                GROUP BY day
                ORDER BY task_count DESC
                LIMIT 1",
            )
            .map_err(|e| format!("Failed to prepare daily query: {}", e))?;

        let most_productive_day = day_stmt
            .query_row(params![seven_days_ago], |row| {
                let day_num: String = row.get(0)?;
                let day_name = match day_num.as_str() {
                    "0" => "Sunday",
                    "1" => "Monday",
                    "2" => "Tuesday",
                    "3" => "Wednesday",
                    "4" => "Thursday",
                    "5" => "Friday",
                    "6" => "Saturday",
                    _ => "Unknown",
                };
                Ok(day_name.to_string())
            })
            .unwrap_or_else(|_| "Unknown".to_string());

        // Calculate average focus duration from metadata
        let mut focus_stmt = db
            .prepare(
                "SELECT AVG(json_extract(metadata, '$.duration')) as avg_focus
                FROM learning_events
                WHERE event_type = 'deep_work'
                  AND created_at > ?1
                  AND json_extract(metadata, '$.duration') IS NOT NULL",
            )
            .map_err(|e| format!("Failed to prepare focus query: {}", e))?;

        let average_focus_duration = focus_stmt
            .query_row(params![seven_days_ago], |row| row.get::<_, Option<f64>>(0))
            .unwrap_or(Some(0.0))
            .unwrap_or(0.0)
            / 60.0; // Convert seconds to minutes

        // Calculate task completion rate
        let mut completion_stmt = db
            .prepare(
                "SELECT 
                    COUNT(CASE WHEN outcome = 'success' THEN 1 END) * 100.0 / COUNT(*) as rate
                FROM learning_events
                WHERE created_at > ?1",
            )
            .map_err(|e| format!("Failed to prepare completion query: {}", e))?;

        let task_completion_rate = completion_stmt
            .query_row(params![seven_days_ago], |row| row.get::<_, Option<f64>>(0))
            .unwrap_or(Some(0.0))
            .unwrap_or(0.0);

        // Generate recommendations
        let mut recommendations = Vec::new();

        if !peak_hours.is_empty() {
            let top_hour = peak_hours[0].start_hour;
            recommendations.push(format!(
                "Schedule complex tasks around {}:00-{}:00 (peak productivity window)",
                top_hour,
                (top_hour + 1) % 24
            ));
        }

        if task_completion_rate < 70.0 {
            recommendations.push(
                "Consider breaking tasks into smaller chunks to improve completion rate"
                    .to_string(),
            );
        }

        if average_focus_duration < 25.0 {
            recommendations.push(
                "Try the Pomodoro technique (25-minute focus blocks) to increase deep work time"
                    .to_string(),
            );
        }

        Ok(ProductivityInsights {
            peak_hours,
            most_productive_day,
            average_focus_duration,
            task_completion_rate,
            recommendations,
        })
    }

    /// Assess risk of commit breaking tests based on file changes
    pub fn assess_commit_risk(&self, files: &[String]) -> Result<RiskLevel, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut total_risk_score = 0.0;

        for file in files {
            // Query historical failures involving this file
            let mut stmt = db
                .prepare(
                    "SELECT COUNT(*) as failure_count
                    FROM learning_events
                    WHERE outcome = 'failure'
                      AND (description LIKE '%' || ?1 || '%' OR title LIKE '%' || ?1 || '%')
                      AND created_at > ?2",
                )
                .map_err(|e| format!("Failed to prepare risk query: {}", e))?;

            let thirty_days_ago = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64
                - (30 * 24 * 60 * 60);

            let failure_count: usize = stmt
                .query_row(params![file, thirty_days_ago], |row| row.get(0))
                .unwrap_or(0);

            // Each failure adds to risk score
            total_risk_score += failure_count as f64;
        }

        // Normalize risk score by number of files
        let avg_risk = if !files.is_empty() {
            total_risk_score / files.len() as f64
        } else {
            0.0
        };

        let risk_level = if avg_risk >= 3.0 {
            RiskLevel::High
        } else if avg_risk >= 1.0 {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };

        debug!(
            "Commit risk for {} files: {:?} (score: {:.2})",
            files.len(),
            risk_level,
            avg_risk
        );

        Ok(risk_level)
    }

    /// Recommend optimal time window for task type based on historical success
    pub fn recommend_task_timing(&self, task_type: &str) -> Result<TimeWindow, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut stmt = db
            .prepare(
                "SELECT 
                    strftime('%H', datetime(created_at, 'unixepoch')) as hour,
                    COUNT(*) as success_count
                FROM learning_events
                WHERE title = ?1
                  AND outcome = 'success'
                  AND created_at > ?2
                GROUP BY hour
                ORDER BY success_count DESC
                LIMIT 1",
            )
            .map_err(|e| format!("Failed to prepare timing query: {}", e))?;

        let seven_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (7 * 24 * 60 * 60);

        let result = stmt.query_row(params![task_type, seven_days_ago], |row| {
            let hour_str: String = row.get(0)?;
            let hour = hour_str.parse::<u8>().unwrap_or(9);
            let count: usize = row.get(1)?;
            Ok((hour, count))
        });

        match result {
            Ok((hour, count)) => {
                debug!(
                    "Optimal timing for {}: {}:00-{}:00 ({} successes)",
                    task_type,
                    hour,
                    (hour + 1) % 24,
                    count
                );
                Ok(TimeWindow {
                    start_hour: hour,
                    end_hour: (hour + 1) % 24,
                    productivity_score: 1.0, // Max score for optimal window
                })
            }
            Err(_) => {
                debug!("No timing data for task_type: {}, using default", task_type);
                Ok(TimeWindow {
                    start_hour: 9,
                    end_hour: 11,
                    productivity_score: 0.5, // Default mid-range score
                })
            }
        }
    }

    /// Get all proactive recommendations (not dismissed)
    pub fn get_proactive_recommendations(&self) -> Result<Vec<Recommendation>, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut stmt = db
            .prepare(
                "SELECT id, timestamp, category, priority, title, description,
                        action_label, action_command, confidence, estimated_impact,
                        executed, dismissed, metadata
                FROM proactive_recommendations
                WHERE dismissed = 0
                ORDER BY 
                    CASE priority
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                        ELSE 5
                    END,
                    timestamp DESC
                LIMIT 50",
            )
            .map_err(|e| format!("Failed to prepare recommendations query: {}", e))?;

        let recommendations: Vec<Recommendation> = stmt
            .query_map([], |row| {
                Ok(Recommendation {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    category: row.get(2)?,
                    priority: row.get(3)?,
                    title: row.get(4)?,
                    description: row.get(5)?,
                    action_label: row.get(6)?,
                    action_command: row.get(7)?,
                    confidence: row.get(8)?,
                    estimated_impact: row.get(9)?,
                    executed: row.get::<_, i64>(10)? != 0,
                    dismissed: row.get::<_, i64>(11)? != 0,
                    metadata: row.get(12)?,
                })
            })
            .map_err(|e| format!("Failed to query recommendations: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        debug!("Retrieved {} active recommendations", recommendations.len());
        Ok(recommendations)
    }

    /// Create a new proactive recommendation
    #[allow(clippy::too_many_arguments)]
    pub fn create_recommendation(
        &self,
        category: &str,
        priority: &str,
        title: &str,
        description: &str,
        action_label: &str,
        action_command: &str,
        confidence: f64,
        estimated_impact: &str,
        metadata: Option<&str>,
    ) -> Result<i64, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        db.execute(
            "INSERT INTO proactive_recommendations (
                timestamp, category, priority, title, description,
                action_label, action_command, confidence, estimated_impact, metadata
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                timestamp,
                category,
                priority,
                title,
                description,
                action_label,
                action_command,
                confidence,
                estimated_impact,
                metadata
            ],
        )
        .map_err(|e| format!("Failed to insert recommendation: {}", e))?;

        let recommendation_id = db.last_insert_rowid();
        info!("Created recommendation #{}: {}", recommendation_id, title);
        Ok(recommendation_id)
    }

    /// Track prediction accuracy
    pub fn track_prediction_accuracy(
        &self,
        prediction_id: i64,
        predicted_value: f64,
        actual_value: f64,
    ) -> Result<(), String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let error_percentage = if predicted_value > 0.0 {
            ((actual_value - predicted_value).abs() / predicted_value) * 100.0
        } else {
            0.0
        };

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        db.execute(
            "INSERT INTO prediction_accuracy (
                prediction_id, predicted_value, actual_value, error_percentage, timestamp
            ) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                prediction_id,
                predicted_value,
                actual_value,
                error_percentage,
                timestamp
            ],
        )
        .map_err(|e| format!("Failed to track accuracy: {}", e))?;

        debug!(
            "Tracked accuracy for prediction #{}: error {:.1}%",
            prediction_id, error_percentage
        );
        Ok(())
    }
}

// ============================================
// Tauri Commands
// ============================================

#[tauri::command]
pub async fn get_task_prediction(
    task_id: String,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<PredictionResult, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.predict_task_duration(&task_id)
}

#[tauri::command]
pub async fn get_productivity_insights(
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<ProductivityInsights, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.get_productivity_insights()
}

#[tauri::command]
pub async fn get_proactive_recommendations(
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<Vec<Recommendation>, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.get_proactive_recommendations()
}

#[tauri::command]
pub async fn assess_commit_risk_command(
    files: Vec<String>,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<RiskLevel, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.assess_commit_risk(&files)
}

#[tauri::command]
pub async fn recommend_task_timing_command(
    task_type: String,
    engine: tauri::State<'_, Arc<Mutex<Option<PredictionEngine>>>>,
) -> Result<TimeWindow, String> {
    let engine_guard = engine
        .lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;

    let engine = engine_guard
        .as_ref()
        .ok_or_else(|| "Prediction engine not initialized".to_string())?;

    engine.recommend_task_timing(&task_type)
}
