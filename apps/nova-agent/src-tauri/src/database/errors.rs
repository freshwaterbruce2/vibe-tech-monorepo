use rusqlite;

/// Database-specific error type with user-friendly messages
#[derive(Debug)]
pub enum DatabaseError {
    /// Database is temporarily unavailable (retry-able)
    Busy(String),
    /// Database is locked by another process
    Locked(String),
    /// Connection failed
    #[allow(dead_code)]
    ConnectionFailed(String),
    /// Query failed (may or may not be retry-able)
    QueryFailed(String),
    /// Data not found
    NotFound(String),
    /// Duplicate task detected
    DuplicateTask(String),
    /// Generic error
    Other(String),
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DatabaseError::Busy(msg) => write!(f, "Database busy: {}. Please try again.", msg),
            DatabaseError::Locked(msg) => write!(
                f,
                "Database locked: {}. Another process may be using it.",
                msg
            ),
            DatabaseError::ConnectionFailed(msg) => {
                write!(f, "Failed to connect to database: {}", msg)
            }
            DatabaseError::QueryFailed(msg) => write!(f, "Database query failed: {}", msg),
            DatabaseError::NotFound(msg) => write!(f, "Not found: {}", msg),
            DatabaseError::DuplicateTask(id) => write!(f, "Duplicate task found with id: {}", id),
            DatabaseError::Other(msg) => write!(f, "Database error: {}", msg),
        }
    }
}

impl std::error::Error for DatabaseError {}

impl From<rusqlite::Error> for DatabaseError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::SqliteFailure(sqlite_err, msg) => {
                let msg_str = msg.unwrap_or_else(|| sqlite_err.to_string());
                match sqlite_err.code {
                    rusqlite::ErrorCode::DatabaseBusy => DatabaseError::Busy(msg_str),
                    rusqlite::ErrorCode::DatabaseLocked => DatabaseError::Locked(msg_str),
                    _ => DatabaseError::QueryFailed(msg_str),
                }
            }
            rusqlite::Error::QueryReturnedNoRows => {
                DatabaseError::NotFound("No matching records".to_string())
            }
            _ => DatabaseError::Other(err.to_string()),
        }
    }
}
