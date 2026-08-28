use super::{PredictionAccuracyMetrics, PredictionEngine, Recommendation};
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

    pub fn mark_recommendation_executed(&self, recommendation_id: i64) -> Result<(), String> {
        let db = self
            .prediction_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let updated = db
            .execute(
                "UPDATE proactive_recommendations SET executed = 1 WHERE id = ?1",
                params![recommendation_id],
            )
            .map_err(|e| format!("Failed to mark recommendation executed: {}", e))?;

        if updated == 0 {
            return Err(format!("Recommendation #{} not found", recommendation_id));
        }

        info!("Marked recommendation #{} executed", recommendation_id);
        Ok(())
    }

    pub fn dismiss_recommendation(&self, recommendation_id: i64) -> Result<(), String> {
        let db = self
            .prediction_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let updated = db
            .execute(
                "UPDATE proactive_recommendations SET dismissed = 1 WHERE id = ?1",
                params![recommendation_id],
            )
            .map_err(|e| format!("Failed to dismiss recommendation: {}", e))?;

        if updated == 0 {
            return Err(format!("Recommendation #{} not found", recommendation_id));
        }

        info!("Dismissed recommendation #{}", recommendation_id);
        Ok(())
    }

    pub fn get_prediction_accuracy_metrics(&self) -> Result<PredictionAccuracyMetrics, String> {
        let db = self
            .prediction_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.query_row(
            "SELECT
                COALESCE(AVG(error_percentage), 0.0),
                COUNT(*),
                COALESCE(SUM(CASE WHEN error_percentage <= 20.0 THEN 1 ELSE 0 END), 0)
             FROM prediction_accuracy",
            [],
            |row| {
                Ok(PredictionAccuracyMetrics {
                    average_error_percentage: row.get(0)?,
                    total_predictions: row.get(1)?,
                    successful_predictions: row.get(2)?,
                })
            },
        )
        .map_err(|e| format!("Failed to query prediction accuracy: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn test_engine() -> PredictionEngine {
        let dir = tempdir().expect("create tempdir");
        let db_path = dir.into_path().join("agent_learning.db");
        PredictionEngine::new(db_path).expect("create prediction engine")
    }

    #[test]
    fn recommendation_execute_and_dismiss_update_state() {
        let engine = test_engine();
        let id = engine
            .create_recommendation(
                "predictive",
                "medium",
                "Run focused validation",
                "A focused check is likely to catch integration drift.",
                "Run check",
                "pnpm nx check:rust nova-agent",
                0.8,
                "Improves release confidence",
                None,
            )
            .expect("create recommendation");

        engine
            .mark_recommendation_executed(id)
            .expect("mark recommendation executed");

        let active = engine
            .get_proactive_recommendations()
            .expect("query recommendations");
        assert_eq!(active.len(), 1);
        assert!(active[0].executed);

        engine
            .dismiss_recommendation(id)
            .expect("dismiss recommendation");
        let active = engine
            .get_proactive_recommendations()
            .expect("query recommendations after dismiss");
        assert!(active.is_empty());
    }

    #[test]
    fn prediction_accuracy_metrics_report_totals_and_successes() {
        let engine = test_engine();
        let id = engine
            .create_recommendation(
                "predictive",
                "low",
                "Estimate duration",
                "Use historical timing data.",
                "Review",
                "review",
                0.7,
                "Improves estimates",
                None,
            )
            .expect("create recommendation");

        engine
            .track_prediction_accuracy(id, 100.0, 115.0)
            .expect("record accurate prediction");
        engine
            .track_prediction_accuracy(id, 100.0, 150.0)
            .expect("record inaccurate prediction");

        let metrics = engine
            .get_prediction_accuracy_metrics()
            .expect("query accuracy metrics");
        assert_eq!(metrics.total_predictions, 2);
        assert_eq!(metrics.successful_predictions, 1);
        assert!((metrics.average_error_percentage - 32.5).abs() < f64::EPSILON);
    }
}
