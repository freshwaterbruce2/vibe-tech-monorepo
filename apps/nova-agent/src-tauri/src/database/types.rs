use crate::database::errors::DatabaseError;
use serde::{Deserialize, Serialize};
use std::thread;
use std::time::Duration;
use tracing::{debug, error, warn};

/// Retry configuration for database operations
#[derive(Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Initial delay between retries (milliseconds)
    pub initial_delay_ms: u64,
    /// Maximum delay between retries (milliseconds)
    pub max_delay_ms: u64,
    /// Multiplier for exponential backoff
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 100,
            max_delay_ms: 2000,
            backoff_multiplier: 2.0,
        }
    }
}

/// Execute a database operation with retry logic
pub fn with_retry<F, T>(
    config: &RetryConfig,
    operation_name: &str,
    mut operation: F,
) -> Result<T, DatabaseError>
where
    F: FnMut() -> Result<T, DatabaseError>,
{
    let mut attempt = 0;
    let mut delay_ms = config.initial_delay_ms;

    loop {
        match operation() {
            Ok(result) => {
                if attempt > 0 {
                    debug!("{} succeeded after {} retries", operation_name, attempt);
                }
                return Ok(result);
            }
            Err(e) => {
                // Only retry for transient errors
                let should_retry = matches!(e, DatabaseError::Busy(_) | DatabaseError::Locked(_));

                if !should_retry || attempt >= config.max_retries {
                    if attempt > 0 {
                        error!(
                            "{} failed after {} attempts: {}",
                            operation_name,
                            attempt + 1,
                            e
                        );
                    }
                    return Err(e);
                }

                attempt += 1;
                warn!(
                    "{} failed (attempt {}/{}), retrying in {}ms: {}",
                    operation_name,
                    attempt,
                    config.max_retries + 1,
                    delay_ms,
                    e
                );

                thread::sleep(Duration::from_millis(delay_ms));
                delay_ms = ((delay_ms as f64) * config.backoff_multiplier) as u64;
                delay_ms = delay_ms.min(config.max_delay_ms);
            }
        }
    }
}

/// Represents a task from the tasks database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub metadata: Option<String>,
}

/// Represents an activity from the activity database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: i64,
    pub timestamp: i64,
    pub activity_type: String,
    pub details: Option<String>,
    pub metadata: Option<String>,
}

/// Represents a learning event from the learning database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningEvent {
    pub id: i64,
    pub timestamp: i64,
    pub event_type: String,
    pub context: Option<String>,
    pub outcome: Option<String>,
    pub metadata: Option<String>,
}

/// Represents the current focus state (single-row heartbeat updated every second).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusState {
    pub last_seen: i64,
    pub focus_started_at: i64,
    pub process_name: String,
    pub window_title: String,
    pub process_id: i64,
}
