use super::{PredictionEngine, ProductivityInsights, TimeWindow};
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

impl PredictionEngine {
    /// Analyze productivity patterns by hour and day
    pub fn get_productivity_insights(&self) -> Result<ProductivityInsights, String> {
        let db = self
            .prediction_db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let seven_days_ago = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            - (7 * 24 * 60 * 60);

        let peak_hours = query_peak_hours(&db, seven_days_ago)?;
        let most_productive_day = query_most_productive_day(&db, seven_days_ago)?;
        let average_focus_duration = query_average_focus_duration(&db, seven_days_ago)?;
        let task_completion_rate = query_task_completion_rate(&db, seven_days_ago)?;

        Ok(ProductivityInsights {
            recommendations: build_recommendations(
                &peak_hours,
                average_focus_duration,
                task_completion_rate,
            ),
            peak_hours,
            most_productive_day,
            average_focus_duration,
            task_completion_rate,
        })
    }
}

fn query_peak_hours(db: &rusqlite::Connection, since: i64) -> Result<Vec<TimeWindow>, String> {
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

    let hourly_data: Vec<(u8, usize)> = hour_stmt
        .query_map(params![since], |row| {
            let hour_str: String = row.get(0)?;
            let hour = hour_str.parse::<u8>().unwrap_or(0);
            let count: usize = row.get(1)?;
            Ok((hour, count))
        })
        .map_err(|e| format!("Failed to query hourly data: {}", e))?
        .filter_map(|row| row.ok())
        .collect();

    let max_count = hourly_data
        .iter()
        .map(|(_, count)| *count)
        .max()
        .unwrap_or(1);
    Ok(hourly_data
        .iter()
        .take(3)
        .map(|(hour, count)| TimeWindow {
            start_hour: *hour,
            end_hour: (hour + 1) % 24,
            productivity_score: (*count as f64) / (max_count as f64),
        })
        .collect())
}

fn query_most_productive_day(db: &rusqlite::Connection, since: i64) -> Result<String, String> {
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

    Ok(day_stmt
        .query_row(params![since], |row| {
            let day_num: String = row.get(0)?;
            Ok(day_name(&day_num).to_string())
        })
        .unwrap_or_else(|_| "Unknown".to_string()))
}

fn query_average_focus_duration(db: &rusqlite::Connection, since: i64) -> Result<f64, String> {
    let mut focus_stmt = db
        .prepare(
            "SELECT AVG(COALESCE(
                json_extract(metadata, '$.duration_minutes'),
                json_extract(metadata, '$.duration') / 60.0
            )) as avg_focus
            FROM learning_events
            WHERE created_at > ?1
              AND (
                json_extract(metadata, '$.duration_minutes') IS NOT NULL
                OR json_extract(metadata, '$.duration') IS NOT NULL
              )
              AND (
                json_extract(metadata, '$.duration_minutes') IS NOT NULL
                OR title LIKE '%deep_work%'
                OR title LIKE '%focus%'
                OR description LIKE '%focused%'
              )",
        )
        .map_err(|e| format!("Failed to prepare focus query: {}", e))?;

    Ok(focus_stmt
        .query_row(params![since], |row| row.get::<_, Option<f64>>(0))
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0))
}

fn query_task_completion_rate(db: &rusqlite::Connection, since: i64) -> Result<f64, String> {
    let mut completion_stmt = db
        .prepare(
            "SELECT 
                COUNT(CASE WHEN outcome = 'success' THEN 1 END) * 100.0 / COUNT(*) as rate
            FROM learning_events
            WHERE created_at > ?1",
        )
        .map_err(|e| format!("Failed to prepare completion query: {}", e))?;

    Ok(completion_stmt
        .query_row(params![since], |row| row.get::<_, Option<f64>>(0))
        .unwrap_or(Some(0.0))
        .unwrap_or(0.0))
}

fn build_recommendations(
    peak_hours: &[TimeWindow],
    average_focus_duration: f64,
    task_completion_rate: f64,
) -> Vec<String> {
    let mut recommendations = Vec::new();

    if let Some(top_window) = peak_hours.first() {
        recommendations.push(format!(
            "Schedule complex tasks around {}:00-{}:00 (peak productivity window)",
            top_window.start_hour, top_window.end_hour
        ));
    }

    if task_completion_rate < 70.0 {
        recommendations
            .push("Consider breaking tasks into smaller chunks to improve completion rate".into());
    }

    if average_focus_duration < 25.0 {
        recommendations.push(
            "Try the Pomodoro technique (25-minute focus blocks) to increase deep work time".into(),
        );
    }

    recommendations
}

fn day_name(day_num: &str) -> &'static str {
    match day_num {
        "0" => "Sunday",
        "1" => "Monday",
        "2" => "Tuesday",
        "3" => "Wednesday",
        "4" => "Thursday",
        "5" => "Friday",
        "6" => "Saturday",
        _ => "Unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn live_schema_db() -> Connection {
        let db = Connection::open_in_memory().expect("open in-memory db");
        db.execute_batch(
            "CREATE TABLE learning_events (
                id INTEGER PRIMARY KEY,
                title TEXT,
                description TEXT,
                outcome TEXT,
                app_source TEXT,
                created_at INTEGER,
                metadata TEXT
            );",
        )
        .expect("create learning_events");
        db
    }

    #[test]
    fn average_focus_duration_uses_live_learning_event_schema() {
        let db = live_schema_db();
        db.execute(
            "INSERT INTO learning_events (
                title,
                description,
                outcome,
                app_source,
                created_at,
                metadata
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "deep_work_session",
                "Focused coding session",
                "success",
                "nova",
                100,
                r#"{"duration_minutes":90}"#,
            ],
        )
        .expect("insert duration_minutes event");
        db.execute(
            "INSERT INTO learning_events (
                title,
                description,
                outcome,
                app_source,
                created_at,
                metadata
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "focus_session",
                "Focused writing session",
                "success",
                "nova",
                200,
                r#"{"duration":1800}"#,
            ],
        )
        .expect("insert duration seconds event");

        let avg = query_average_focus_duration(&db, 0).expect("query avg focus");

        assert!((avg - 60.0).abs() < f64::EPSILON);
    }
}
