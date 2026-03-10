use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

use crate::modules::websocket_auth::TokenManager;

// ============================================
// CONNECTION STATE & CONFIGURATION
// ============================================

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
            initial_delay_ms: 1000, // Start with 1 second
            max_delay_ms: 30000,    // Cap at 30 seconds
            backoff_multiplier: 2.0,
            max_pending_messages: 100,   // Keep up to 100 messages queued
            heartbeat_interval_secs: 30, // Send heartbeat every 30 seconds
        }
    }
}

/// IPC Message types matching @vibetech/shared-ipc schema
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IpcMessage {
    #[serde(rename = "file:open")]
    FileOpen { payload: FileOpenPayload },

    #[serde(rename = "learning:sync")]
    LearningSync { payload: LearningSyncPayload },

    #[serde(rename = "context:update")]
    ContextUpdate { payload: Value },

    #[serde(rename = "activity:sync")]
    ActivitySync { payload: ActivitySyncPayload },

    #[serde(rename = "guidance:request")]
    GuidanceRequest { payload: GuidanceRequestPayload },

    #[serde(rename = "task:update")]
    TaskUpdate { payload: TaskUpdatePayload },

    #[serde(rename = "bridge:status")]
    BridgeStatus { payload: BridgeStatusPayload },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOpenPayload {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningSyncPayload {
    pub events: Vec<LearningEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningEvent {
    pub id: String,
    pub event_type: String,
    pub context: String,
    pub outcome: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivitySyncPayload {
    pub activities: Vec<ActivityRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityRecord {
    pub activity_type: String,
    pub details: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceRequestPayload {
    pub context: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskUpdatePayload {
    pub task_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeStatusPayload {
    pub connected: bool,
    pub client_id: String,
    pub timestamp: u64,
}

/// Callback type for handling messages
pub type MessageHandler = Arc<dyn Fn(IpcMessage) + Send + Sync>;

/// Statistics for connection monitoring
#[derive(Default)]
struct ConnectionStats {
    messages_sent: u64,
    messages_received: u64,
    last_connected_at: Option<Instant>,
    last_disconnected_at: Option<Instant>,
}

pub struct DeepCodeClient {
    url: String,
    tx: Option<
        futures_util::stream::SplitSink<
            tokio_tungstenite::WebSocketStream<
                tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
            >,
            Message,
        >,
    >,
    connected: Arc<Mutex<bool>>,
    client_id: String,
    message_handlers: Vec<MessageHandler>,
    pending_messages: Arc<Mutex<Vec<IpcMessage>>>, // Dead-letter queue
    config: ReconnectConfig,
    reconnect_attempts: Arc<Mutex<u32>>,
    stats: Arc<Mutex<ConnectionStats>>,
    token_manager: TokenManager,
}

impl DeepCodeClient {
    pub fn new(url: String) -> Self {
        Self::with_config(url, ReconnectConfig::default())
    }

    pub fn with_config(url: String, config: ReconnectConfig) -> Self {
        Self {
            url,
            tx: None,
            connected: Arc::new(Mutex::new(false)),
            client_id: uuid::Uuid::new_v4().to_string(),
            message_handlers: Vec::new(),
            pending_messages: Arc::new(Mutex::new(Vec::new())),
            config,
            reconnect_attempts: Arc::new(Mutex::new(0)),
            stats: Arc::new(Mutex::new(ConnectionStats::default())),
            token_manager: TokenManager::new(),
        }
    }

    /// Get current connection state for monitoring
    #[allow(dead_code)]
    pub async fn get_connection_state(&self) -> ConnectionState {
        let connected = *self.connected.lock().await;
        let reconnect_attempts = *self.reconnect_attempts.lock().await;
        let pending = self.pending_messages.lock().await;
        let stats = self.stats.lock().await;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        ConnectionState {
            connected,
            reconnect_attempts,
            last_connected: stats.last_connected_at.map(|_| now), // Simplified for serialization
            last_disconnected: stats.last_disconnected_at.map(|_| now),
            pending_message_count: pending.len(),
            total_messages_sent: stats.messages_sent,
            total_messages_received: stats.messages_received,
        }
    }

    /// Calculate delay for next reconnection attempt using exponential backoff
    fn calculate_reconnect_delay(&self, attempt: u32) -> Duration {
        let delay_ms = (self.config.initial_delay_ms as f64)
            * self.config.backoff_multiplier.powi(attempt as i32);
        let capped_delay = delay_ms.min(self.config.max_delay_ms as f64) as u64;
        Duration::from_millis(capped_delay)
    }

    /// Compute the next reconnect delay using current attempt count
    pub async fn next_reconnect_delay(&self) -> Duration {
        let attempts = *self.reconnect_attempts.lock().await;
        self.calculate_reconnect_delay(attempts)
    }

    /// Register a message handler callback
    pub fn on_message(&mut self, handler: MessageHandler) {
        self.message_handlers.push(handler);
    }

    pub async fn connect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let attempt = *self.reconnect_attempts.lock().await;
        info!(
            "Connecting to Deep Code Editor at {} (attempt {})",
            self.url,
            attempt + 1
        );

        match connect_async(&self.url).await {
            Ok((ws_stream, _)) => {
                info!("Connected to Deep Code Editor successfully");
                let (write, mut read) = ws_stream.split();
                self.tx = Some(write);

                // Update connection state
                {
                    let mut connected = self.connected.lock().await;
                    *connected = true;
                }
                {
                    let mut attempts = self.reconnect_attempts.lock().await;
                    *attempts = 0; // Reset on successful connection
                }
                {
                    let mut stats = self.stats.lock().await;
                    stats.last_connected_at = Some(Instant::now());
                }

                // Send bridge status announcement
                self.send_bridge_status().await.ok();

                // Send JWT authentication message (2026 security best practice)
                if let Err(e) = self.send_auth_message().await {
                    warn!("Failed to send auth message: {}", e);
                    // Continue anyway - auth is optional for local connections
                }

                // Flush any pending messages
                self.flush_pending_messages().await;

                let connected_flag = self.connected.clone();
                let handlers = self.message_handlers.clone();
                let stats = self.stats.clone();

                // Spawn a task to handle incoming messages
                tokio::spawn(async move {
                    while let Some(msg) = read.next().await {
                        match msg {
                            Ok(Message::Text(text)) => {
                                debug!("Received message from Deep Code Editor: {}", text);

                                // Update receive stats
                                {
                                    let mut s = stats.lock().await;
                                    s.messages_received += 1;
                                }

                                // Parse and handle the message
                                match serde_json::from_str::<IpcMessage>(&text) {
                                    Ok(ipc_msg) => {
                                        Self::handle_message(&ipc_msg, &handlers).await;
                                    }
                                    Err(e) => {
                                        warn!("Failed to parse IPC message: {} - Raw: {}", e, text);
                                    }
                                }
                            }
                            Ok(Message::Ping(_data)) => {
                                debug!("Received ping, will auto-pong");
                                // tungstenite handles pong automatically
                            }
                            Ok(Message::Close(frame)) => {
                                let reason = frame
                                    .map(|f| f.reason.to_string())
                                    .unwrap_or_else(|| "unknown".to_string());
                                warn!("Deep Code Editor connection closed: {}", reason);
                                {
                                    let mut connected = connected_flag.lock().await;
                                    *connected = false;
                                }
                                {
                                    let mut s = stats.lock().await;
                                    s.last_disconnected_at = Some(Instant::now());
                                }
                                break;
                            }
                            Err(e) => {
                                error!("WebSocket error: {}", e);
                                {
                                    let mut connected = connected_flag.lock().await;
                                    *connected = false;
                                }
                                {
                                    let mut s = stats.lock().await;
                                    s.last_disconnected_at = Some(Instant::now());
                                }
                                break;
                            }
                            _ => {}
                        }
                    }
                });

                Ok(())
            }
            Err(e) => {
                // Increment reconnect attempts
                {
                    let mut attempts = self.reconnect_attempts.lock().await;
                    *attempts += 1;
                }
                let attempts = *self.reconnect_attempts.lock().await;
                let delay = self.calculate_reconnect_delay(attempts);

                error!(
                    "Failed to connect to Deep Code Editor (attempt {}): {}. Next retry in {:?}",
                    attempts, e, delay
                );
                Err(Box::new(e))
            }
        }
    }

    /// Connect with automatic reconnection loop
    #[allow(dead_code)]
    pub async fn connect_with_reconnect(&mut self) {
        loop {
            match self.connect().await {
                Ok(()) => {
                    info!("WebSocket connected, monitoring connection...");
                    // Wait until disconnected
                    loop {
                        tokio::time::sleep(Duration::from_secs(1)).await;
                        if !*self.connected.lock().await {
                            break;
                        }
                    }
                }
                Err(e) => {
                    warn!("Connection failed: {}", e);
                }
            }

            let attempts = *self.reconnect_attempts.lock().await;
            let delay = self.calculate_reconnect_delay(attempts);
            info!("Reconnecting in {:?}...", delay);
            tokio::time::sleep(delay).await;
        }
    }

    /// Handle incoming IPC messages
    async fn handle_message(msg: &IpcMessage, handlers: &[MessageHandler]) {
        info!("Handling IPC message: {:?}", std::mem::discriminant(msg));

        match msg {
            IpcMessage::FileOpen { payload } => {
                info!("Received file:open request for: {}", payload.path);
                // In a full implementation, this would open the file in the editor
                // For now, we log it
                if let Some(line) = payload.line {
                    info!("  -> at line {}", line);
                }
            }

            IpcMessage::LearningSync { payload } => {
                info!(
                    "Received learning:sync with {} events",
                    payload.events.len()
                );
                for event in &payload.events {
                    debug!("  Learning event: {} - {}", event.event_type, event.outcome);
                }
            }

            IpcMessage::ContextUpdate { payload } => {
                info!("Received context:update");
                debug!("  Context payload: {:?}", payload);
            }

            IpcMessage::ActivitySync { payload } => {
                info!(
                    "Received activity:sync with {} activities",
                    payload.activities.len()
                );
            }

            IpcMessage::GuidanceRequest { payload: _ } => {
                info!("Received guidance:request");
                // This would trigger the guidance engine
            }

            IpcMessage::TaskUpdate { payload } => {
                info!(
                    "Received task:update for task {}: {}",
                    payload.task_id, payload.status
                );
            }

            IpcMessage::BridgeStatus { payload } => {
                info!(
                    "Bridge status from {}: connected={}",
                    payload.client_id, payload.connected
                );
            }
        }

        // Call registered handlers
        for handler in handlers {
            handler(msg.clone());
        }
    }

    /// Send bridge status announcement
    async fn send_bridge_status(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let message = IpcMessage::BridgeStatus {
            payload: BridgeStatusPayload {
                connected: true,
                client_id: self.client_id.clone(),
                timestamp,
            },
        };

        self.send_ipc_message(message).await
    }

    /// Send JWT authentication message (2026 security best practice)
    async fn send_auth_message(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let session_id = format!("session-{}", uuid::Uuid::new_v4());

        let auth_msg = self.token_manager
            .create_auth_message(&self.client_id, &session_id)
            .map_err(|e| format!("Failed to create auth message: {}", e))?;

        if let Some(tx) = &mut self.tx {
            let json_str = serde_json::to_string(&auth_msg)?;
            tx.send(Message::Text(json_str)).await?;
            info!("Sent JWT authentication message for client {}", self.client_id);
        }

        Ok(())
    }

    /// Flush pending messages (dead-letter queue)
    async fn flush_pending_messages(&mut self) {
        let mut pending = self.pending_messages.lock().await;
        if pending.is_empty() {
            return;
        }

        info!("Flushing {} pending messages", pending.len());

        let messages: Vec<IpcMessage> = pending.drain(..).collect();
        drop(pending); // Release lock before sending

        for msg in messages {
            if let Err(e) = self.send_ipc_message(msg).await {
                warn!("Failed to flush pending message: {}", e);
            }
        }
    }

    /// Send an IPC message
    pub async fn send_ipc_message(
        &mut self,
        message: IpcMessage,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let connected = *self.connected.lock().await;

        if !connected {
            // Queue message for later (with limit)
            let mut pending = self.pending_messages.lock().await;
            if pending.len() >= self.config.max_pending_messages {
                warn!(
                    "Pending message queue full ({} messages), dropping oldest",
                    pending.len()
                );
                pending.remove(0); // Drop oldest
            }
            info!(
                "Not connected, queueing message for later delivery ({} pending)",
                pending.len() + 1
            );
            pending.push(message);
            return Ok(());
        }

        if let Some(tx) = &mut self.tx {
            let json_str = serde_json::to_string(&message)?;
            tx.send(Message::Text(json_str)).await?;

            // Update stats
            {
                let mut stats = self.stats.lock().await;
                stats.messages_sent += 1;
            }

            debug!("Sent IPC message: {:?}", std::mem::discriminant(&message));
            Ok(())
        } else {
            Err("WebSocket sender not available".into())
        }
    }

    #[allow(dead_code)]
    pub async fn send_message(&mut self, message: Value) -> Result<(), Box<dyn std::error::Error>> {
        let connected = *self.connected.lock().await;

        if !connected {
            warn!("Not connected to Deep Code Editor");
            return Err("Not connected to Deep Code Editor".into());
        }

        if let Some(tx) = &mut self.tx {
            let json_str = serde_json::to_string(&message)?;
            tx.send(Message::Text(json_str)).await?;

            // Update stats
            {
                let mut stats = self.stats.lock().await;
                stats.messages_sent += 1;
            }

            Ok(())
        } else {
            Err("Not connected to Deep Code Editor".into())
        }
    }

    #[allow(dead_code)]
    pub async fn send_context_update(
        &mut self,
        payload: Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = IpcMessage::ContextUpdate { payload };
        self.send_ipc_message(message).await
    }

    #[allow(dead_code)]
    pub async fn sync_learning(
        &mut self,
        events: Vec<LearningEvent>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = IpcMessage::LearningSync {
            payload: LearningSyncPayload { events },
        };
        self.send_ipc_message(message).await
    }

    #[allow(dead_code)]
    pub async fn request_file_open(
        &mut self,
        path: String,
        line: Option<u32>,
        column: Option<u32>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = IpcMessage::FileOpen {
            payload: FileOpenPayload { path, line, column },
        };
        self.send_ipc_message(message).await
    }

    #[allow(dead_code)]
    pub async fn update_task(
        &mut self,
        task_id: String,
        status: String,
        title: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = IpcMessage::TaskUpdate {
            payload: TaskUpdatePayload {
                task_id,
                status,
                title,
            },
        };
        self.send_ipc_message(message).await
    }

    pub async fn is_connected(&self) -> bool {
        *self.connected.lock().await
    }
}
