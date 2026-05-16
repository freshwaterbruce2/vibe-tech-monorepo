use super::{PredictionEngine, Recommendation};
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{debug, info};

impl PredictionEngine {
    /// Get all proactive recommendations that have not been dismissed.
    pub fn get_proactive_recommendations(&self) -> Result<Vec<Recommendation>, String> {
        let db = self
            .prediction_db
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
            .filter_map(|row| row.ok())
            .collect();

        debug!("Retrieved {} active recommendations", recommendations.len());
        Ok(recommendations)
    }

    /// Create a new proactive recommendation.
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
            .prediction_db
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

    /// Track prediction accuracy.
    pub fn track_prediction_accuracy(
        &self,
        prediction_id: i64,
        predicted_value: f64,
        actual_value: f64,
    ) -> Result<(), String> {
        let db = self
            .prediction_db
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
