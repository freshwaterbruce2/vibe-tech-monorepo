use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;

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
