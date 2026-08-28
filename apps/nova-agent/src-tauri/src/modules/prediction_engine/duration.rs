use super::{PredictionEngine, PredictionResult};
use rusqlite::params;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::debug;

impl PredictionEngine {
    /// Predict task completion duration based on historical data
    pub fn predict_task_duration(&self, task_type: &str) -> Result<PredictionResult, String> {
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
            .prediction_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let thirty_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (30 * 24 * 60 * 60);

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
        let variance = calculate_duration_variance(&db, task_type, thirty_days_ago, avg_duration)?;
        let confidence = (sample_size as f64 / 10.0).min(1.0);

        let result = PredictionResult {
            estimated_duration: avg_duration,
            confidence,
            variance,
            sample_size,
        };

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
}

fn calculate_duration_variance(
    db: &rusqlite::Connection,
    task_type: &str,
    thirty_days_ago: i64,
    avg_duration: f64,
) -> Result<f64, String> {
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

    if durations.len() > 1 {
        let sum_sq_diff: f64 = durations
            .iter()
            .map(|duration| (duration - avg_duration).powi(2))
            .sum();
        Ok((sum_sq_diff / (durations.len() - 1) as f64).sqrt())
    } else {
        Ok(0.0)
    }
}
