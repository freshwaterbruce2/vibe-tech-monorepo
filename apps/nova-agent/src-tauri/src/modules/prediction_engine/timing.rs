use super::{PredictionEngine, TimeWindow};
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::debug;

impl PredictionEngine {
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
                    productivity_score: 1.0,
                })
            }
            Err(_) => {
                debug!("No timing data for task_type: {}, using default", task_type);
                Ok(TimeWindow {
                    start_hour: 9,
                    end_hour: 11,
                    productivity_score: 0.5,
                })
            }
        }
    }
}
