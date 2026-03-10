//! Guidance Types for Nova Agent
//!
//! Contains all types, enums, and traits used by the guidance system.

use crate::context_engine::SystemContext;
use crate::database::{Activity, LearningEvent, Task};
use serde::{Deserialize, Serialize};

/// A single guidance item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceItem {
    pub id: String,
    pub category: GuidanceCategory,
    pub priority: GuidancePriority,
    pub title: String,
    pub description: String,
    pub action: Option<GuidanceAction>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GuidanceCategory {
    NextSteps,
    DoingRight,
    AtRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum GuidancePriority {
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// Action that can be taken for a guidance item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceAction {
    pub action_type: String,
    pub payload: serde_json::Value,
}

/// Complete guidance response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuidanceResponse {
    pub next_steps: Vec<GuidanceItem>,
    pub doing_right: Vec<GuidanceItem>,
    pub at_risk: Vec<GuidanceItem>,
    pub generated_at: u64,
    pub context_summary: String,
}

/// Input for guidance generation
#[derive(Debug, Clone)]
pub struct GuidanceInput {
    pub context: SystemContext,
    pub tasks: Vec<Task>,
    pub recent_activities: Vec<Activity>,
    pub learning_events: Vec<LearningEvent>,
}

/// Trait for guidance rules
pub trait GuidanceRule {
    #[allow(dead_code)]
    fn name(&self) -> &str;
    fn evaluate(&self, input: &GuidanceInput) -> Vec<GuidanceItem>;
}

/// Helper to get current timestamp
pub fn timestamp_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Helper to safely parse JSON context from learning events
pub fn parse_context_json(context: &Option<String>) -> Option<serde_json::Value> {
    context
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
}
