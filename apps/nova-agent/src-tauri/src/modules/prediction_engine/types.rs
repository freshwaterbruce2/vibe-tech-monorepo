use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionResult {
    pub estimated_duration: f64,
    pub confidence: f64,
    pub variance: f64,
    pub sample_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductivityInsights {
    pub peak_hours: Vec<TimeWindow>,
    pub most_productive_day: String,
    pub average_focus_duration: f64,
    pub task_completion_rate: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeWindow {
    pub start_hour: u8,
    pub end_hour: u8,
    pub productivity_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: i64,
    pub timestamp: i64,
    pub category: String,
    pub priority: String,
    pub title: String,
    pub description: String,
    pub action_label: String,
    pub action_command: String,
    pub confidence: f64,
    pub estimated_impact: String,
    pub executed: bool,
    pub dismissed: bool,
    pub metadata: Option<String>,
}
