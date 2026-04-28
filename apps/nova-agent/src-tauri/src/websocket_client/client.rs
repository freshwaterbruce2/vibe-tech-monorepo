use super::connection::{ConnectionState, ConnectionStats, ReconnectConfig};
use super::messages::{
    BridgeStatusPayload, FileOpenPayload, IpcMessage, LearningEvent, LearningSyncPayload,
    MessageHandler, TaskUpdatePayload,
};
use crate::modules::websocket_auth::TokenManager;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

type WebSocketSink = futures_util::stream::SplitSink<
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    Message,
>;

pub struct DeepCodeClient {
    url: String,
    tx: Option<WebSocketSink>,
    connected: Arc<Mutex<bool>>,
    client_id: String,
    message_handlers: Vec<MessageHandler>,
    pending_messages: Arc<Mutex<Vec<IpcMessage>>>,
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
            last_connected: stats.last_connected_at.map(|_| now),
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
                let (write, read) = ws_stream.split();
                self.tx = Some(write);

                self.mark_connected().await;
                self.send_bridge_status().await.ok();

                if let Err(error) = self.send_auth_message().await {
                    warn!("Failed to send auth message: {}", error);
                }

                self.flush_pending_messages().await;
                self.spawn_reader(read);

                Ok(())
            }
            Err(error) => {
                {
                    let mut attempts = self.reconnect_attempts.lock().await;
                    *attempts += 1;
                }
                let attempts = *self.reconnect_attempts.lock().await;
                let delay = self.calculate_reconnect_delay(attempts);

                error!(
                    "Failed to connect to Deep Code Editor (attempt {}): {}. Next retry in {:?}",
                    attempts, error, delay
                );
                Err(Box::new(error))
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
                    loop {
                        tokio::time::sleep(Duration::from_secs(1)).await;
                        if !*self.connected.lock().await {
                            break;
                        }
                    }
                }
                Err(error) => {
                    warn!("Connection failed: {}", error);
                }
            }

            let attempts = *self.reconnect_attempts.lock().await;
            let delay = self.calculate_reconnect_delay(attempts);
            info!("Reconnecting in {:?}...", delay);
            tokio::time::sleep(delay).await;
        }
    }

    async fn mark_connected(&self) {
        {
            let mut connected = self.connected.lock().await;
            *connected = true;
        }
        {
            let mut attempts = self.reconnect_attempts.lock().await;
            *attempts = 0;
        }
        {
            let mut stats = self.stats.lock().await;
            stats.last_connected_at = Some(Instant::now());
        }
    }

    fn spawn_reader(
        &self,
        mut read: futures_util::stream::SplitStream<
            tokio_tungstenite::WebSocketStream<
                tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
            >,
        >,
    ) {
        let connected_flag = self.connected.clone();
        let handlers = self.message_handlers.clone();
        let stats = self.stats.clone();

        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        debug!("Received message from Deep Code Editor: {}", text);
                        {
                            let mut current_stats = stats.lock().await;
                            current_stats.messages_received += 1;
                        }

                        match serde_json::from_str::<IpcMessage>(&text) {
                            Ok(ipc_msg) => Self::handle_message(&ipc_msg, &handlers).await,
                            Err(error) => {
                                warn!("Failed to parse IPC message: {} - Raw: {}", error, text);
                            }
                        }
                    }
                    Ok(Message::Ping(_data)) => {
                        debug!("Received ping, will auto-pong");
                    }
                    Ok(Message::Close(frame)) => {
                        let reason = frame
                            .map(|frame| frame.reason.to_string())
                            .unwrap_or_else(|| "unknown".to_string());
                        warn!("Deep Code Editor connection closed: {}", reason);
                        mark_disconnected(&connected_flag, &stats).await;
                        break;
                    }
                    Err(error) => {
                        error!("WebSocket error: {}", error);
                        mark_disconnected(&connected_flag, &stats).await;
                        break;
                    }
                    _ => {}
                }
            }
        });
    }

    /// Handle incoming IPC messages
    async fn handle_message(msg: &IpcMessage, handlers: &[MessageHandler]) {
        info!("Handling IPC message: {:?}", std::mem::discriminant(msg));

        match msg {
            IpcMessage::FileOpen { payload } => {
                info!("Received file:open request for: {}", payload.path);
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

    /// Send JWT authentication message
    async fn send_auth_message(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let session_id = format!("session-{}", uuid::Uuid::new_v4());
        let auth_msg = self
            .token_manager
            .create_auth_message(&self.client_id, &session_id)
            .map_err(|error| format!("Failed to create auth message: {}", error))?;

        if let Some(tx) = &mut self.tx {
            let json_str = serde_json::to_string(&auth_msg)?;
            tx.send(Message::Text(json_str)).await?;
            info!(
                "Sent JWT authentication message for client {}",
                self.client_id
            );
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
        drop(pending);

        for msg in messages {
            if let Err(error) = self.send_ipc_message(msg).await {
                warn!("Failed to flush pending message: {}", error);
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
            let mut pending = self.pending_messages.lock().await;
            if pending.len() >= self.config.max_pending_messages {
                warn!(
                    "Pending message queue full ({} messages), dropping oldest",
                    pending.len()
                );
                pending.remove(0);
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
        self.send_ipc_message(IpcMessage::ContextUpdate { payload })
            .await
    }

    #[allow(dead_code)]
    pub async fn sync_learning(
        &mut self,
        events: Vec<LearningEvent>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.send_ipc_message(IpcMessage::LearningSync {
            payload: LearningSyncPayload { events },
        })
        .await
    }

    #[allow(dead_code)]
    pub async fn request_file_open(
        &mut self,
        path: String,
        line: Option<u32>,
        column: Option<u32>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.send_ipc_message(IpcMessage::FileOpen {
            payload: FileOpenPayload { path, line, column },
        })
        .await
    }

    #[allow(dead_code)]
    pub async fn update_task(
        &mut self,
        task_id: String,
        status: String,
        title: Option<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.send_ipc_message(IpcMessage::TaskUpdate {
            payload: TaskUpdatePayload {
                task_id,
                status,
                title,
            },
        })
        .await
    }

    pub async fn is_connected(&self) -> bool {
        *self.connected.lock().await
    }
}

async fn mark_disconnected(connected_flag: &Arc<Mutex<bool>>, stats: &Arc<Mutex<ConnectionStats>>) {
    {
        let mut connected = connected_flag.lock().await;
        *connected = false;
    }
    {
        let mut current_stats = stats.lock().await;
        current_stats.last_disconnected_at = Some(Instant::now());
    }
}
