use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessPattern {
    pub id: i64,
    pub task_type: String,
    pub tools_sequence: String,
    pub description: String,
    pub confidence: f64,
    pub created_at: i64,
}

pub struct PatternRetrievalService {
    db_path: PathBuf,
}

impl PatternRetrievalService {
    pub fn new(db_path: PathBuf) -> Self {
        Self { db_path }
    }

    /// Retrieve successful patterns for a given task type or description
    pub fn retrieve_patterns(&self, query: &str) -> Result<Vec<SuccessPattern>, String> {
        let conn = Connection::open(&self.db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        // Simple similarity check using LIKE for now
        // In a full implementation, we'd use vector search (ChromaDB)
        let mut stmt = conn.prepare(
            "SELECT id, task_type, tools_sequence, title as description, 
                    (CAST(json_extract(metadata, '$.success_count') AS REAL) / 
                     NULLIF(CAST(json_extract(metadata, '$.total_attempts') AS REAL), 0)) as confidence,
                    created_at
             FROM learning_events
             WHERE outcome = 'success'
               AND (title LIKE '%' || ?1 || '%' OR description LIKE '%' || ?1 || '%')
               AND json_extract(metadata, '$.success_count') >= 1
             ORDER BY confidence DESC
             LIMIT 3"
        ).map_err(|e| format!("Failed to prepare query: {}", e))?;

        let patterns = stmt
            .query_map(params![query], |row| {
                Ok(SuccessPattern {
                    id: row.get(0)?,
                    task_type: row.get(1)?,
                    tools_sequence: row.get(2).unwrap_or_else(|_| "[]".to_string()),
                    description: row.get(3).unwrap_or_default(),
                    confidence: row.get::<_, Option<f64>>(4)?.unwrap_or(0.8), // Default high confidence if not tracked
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| format!("Failed to query patterns: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(patterns)
    }

    /// Format patterns for prompt injection
    #[allow(dead_code)]
    pub fn format_patterns_for_prompt(&self, patterns: &[SuccessPattern]) -> String {
        if patterns.is_empty() {
            return String::new();
        }

        let mut output = String::from("\n## 🧠 Learned Strategies (Historical Success)\n");
        output
            .push_str("Based on previous successful tasks, consider these proven approaches:\n\n");

        for (i, pattern) in patterns.iter().enumerate() {
            output.push_str(&format!(
                "{}. **{}** (Confidence: {:.0}%)\n",
                i + 1,
                pattern.description,
                pattern.confidence * 100.0
            ));
            output.push_str(&format!(
                "   - Tool Sequence: `{}`\n",
                pattern.tools_sequence
            ));
        }

        output.push_str("\nPrioritize these strategies if applicable.\n");
        output
    }
}

// Tauri Command
#[tauri::command]
pub async fn get_relevant_patterns(
    query: String,
    _db_state: tauri::State<'_, Arc<Mutex<Option<crate::database::DatabaseService>>>>,
) -> Result<Vec<SuccessPattern>, String> {
    // Note: In a real app, we'd reuse the connection from db_state,
    // but DatabaseService wraps it tightly. For now, we open a new connection
    // or we should expose the path from config.
    // Assuming standard path for now or extracting from state if possible.

    // Quick fix: Retrieve path from config state if available, or default
    let db_path = PathBuf::from("D:\\databases\\agent_learning.db");

    let service = PatternRetrievalService::new(db_path);
    service.retrieve_patterns(&query)
}
