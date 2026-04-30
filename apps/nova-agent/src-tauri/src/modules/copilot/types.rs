use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodePattern {
    pub id: i64,
    pub pattern_type: String,
    pub name: String,
    pub code_snippet: String,
    pub file_path: String,
    pub language: String,
    pub imports: Option<String>,
    pub usage_count: i32,
    pub last_used: Option<i64>,
    pub tags: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSuggestion {
    pub pattern: CodePattern,
    pub relevance_score: f32,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub total_patterns: i64,
    pub by_language: Vec<(String, i64)>,
    pub by_type: Vec<(String, i64)>,
    pub last_indexed: Option<i64>,
}
