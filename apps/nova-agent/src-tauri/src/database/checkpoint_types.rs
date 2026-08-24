use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CheckpointContent {
    pub state: String,
    pub plan: Value,
    pub progress: Value,
    pub tool_results: Value,
    pub pending_approval: Option<Value>,
    pub errors: Value,
    pub conversation: Value,
    pub next_action: Value,
    pub workspace_fingerprint: String,
    pub preconditions: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskCheckpoint {
    pub task_id: String,
    pub schema_version: i64,
    pub revision: i64,
    #[serde(flatten)]
    pub content: CheckpointContent,
    pub checksum: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckpointClassification {
    Resumable,
    AwaitingApproval,
    NeedsReview,
    Stale,
    Corrupt,
    Completed,
}

#[derive(Debug, Clone)]
pub(crate) struct CheckpointInspection {
    pub checkpoint: TaskCheckpoint,
    pub classification: CheckpointClassification,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResumeCandidate {
    pub task_id: String,
    pub revision: i64,
    pub classification: CheckpointClassification,
    pub reason: Option<String>,
    pub pending_approval: Option<ApprovalSummary>,
    pub uncertain_action_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalSummary {
    pub action_fingerprint: String,
    pub approval_digest: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionClaim {
    Started,
    Completed(String),
    Running,
    Uncertain,
}
