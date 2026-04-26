use super::{PredictionEngine, RiskLevel};
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::debug;

impl PredictionEngine {
    /// Assess risk of commit breaking tests based on file changes
    pub fn assess_commit_risk(&self, files: &[String]) -> Result<RiskLevel, String> {
        let db = self
            .learning_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let thirty_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (30 * 24 * 60 * 60);

        let mut total_risk_score = 0.0;

        for file in files {
            let mut stmt = db
                .prepare(
                    "SELECT COUNT(*) as failure_count
                    FROM learning_events
                    WHERE outcome = 'failure'
                      AND (description LIKE '%' || ?1 || '%' OR title LIKE '%' || ?1 || '%')
                      AND created_at > ?2",
                )
                .map_err(|e| format!("Failed to prepare risk query: {}", e))?;

            let failure_count: usize = stmt
                .query_row(params![file, thirty_days_ago], |row| row.get(0))
                .unwrap_or(0);

            total_risk_score += failure_count as f64;
        }

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
}
