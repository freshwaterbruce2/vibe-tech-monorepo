use serde::Serialize;
use std::time::Instant;

/// Connection state for monitoring
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
pub struct ConnectionState {
    pub connected: bool,
    pub reconnect_attempts: u32,
    pub last_connected: Option<u64>,
    pub last_disconnected: Option<u64>,
    pub pending_message_count: usize,
    pub total_messages_sent: u64,
    pub total_messages_received: u64,
}

/// Configuration for WebSocket reconnection behavior
#[derive(Clone)]
pub struct ReconnectConfig {
    /// Initial delay before first reconnection attempt (ms)
    pub initial_delay_ms: u64,
    /// Maximum delay between reconnection attempts (ms)
    pub max_delay_ms: u64,
    /// Multiplier for exponential backoff
    pub backoff_multiplier: f64,
    /// Maximum number of pending messages to queue
    pub max_pending_messages: usize,
    /// Heartbeat interval for connection health check (seconds)
    #[allow(dead_code)]
    pub heartbeat_interval_secs: u64,
}

impl Default for ReconnectConfig {
    fn default() -> Self {
        Self {
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
            max_pending_messages: 100,
            heartbeat_interval_secs: 30,
        }
    }
}

/// Statistics for connection monitoring
#[derive(Default)]
pub(super) struct ConnectionStats {
    pub messages_sent: u64,
    pub messages_received: u64,
    pub last_connected_at: Option<Instant>,
    pub last_disconnected_at: Option<Instant>,
}
