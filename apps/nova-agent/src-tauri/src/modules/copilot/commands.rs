use super::indexer::index_codebase;
use super::types::{CodePattern, CodeSuggestion, IndexStats};
use crate::database::connection::DatabaseService;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::info;

#[tauri::command]
pub async fn index_codebase_command(
    root_path: String,
    max_files: Option<usize>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<String, String> {
    info!("Indexing codebase: {}", root_path);

    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    db_service
        .init_copilot_tables()
        .map_err(|e| format!("Failed to init tables: {}", e))?;

    let count = index_codebase(db_service, &root_path, max_files.unwrap_or(1000))?;

    Ok(format!("Indexed {} code patterns", count))
}

#[tauri::command]
pub async fn search_patterns(
    query: String,
    language: Option<String>,
    limit: Option<usize>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<Vec<CodePattern>, String> {
    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    let patterns = db_service
        .search_code_patterns(&query, language.as_deref(), limit.unwrap_or(10))
        .map_err(|e| format!("Search failed: {}", e))?;

    Ok(patterns)
}

#[tauri::command]
pub async fn get_copilot_stats_command(
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<IndexStats, String> {
    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    let stats = db_service
        .get_copilot_stats()
        .map_err(|e| format!("Failed to get stats: {}", e))?;

    Ok(stats)
}

#[tauri::command]
pub async fn use_pattern(
    pattern_id: i64,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<String, String> {
    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    db_service
        .increment_pattern_usage(pattern_id)
        .map_err(|e| format!("Failed to update usage: {}", e))?;

    Ok("Pattern usage updated".to_string())
}

#[tauri::command]
pub async fn get_suggestions(
    context: String,
    language: Option<String>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<Vec<CodeSuggestion>, String> {
    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    let keywords: Vec<&str> = context
        .split_whitespace()
        .filter(|w| w.len() > 3)
        .take(5)
        .collect();

    let mut all_suggestions = Vec::new();

    for keyword in keywords {
        let patterns = db_service
            .search_code_patterns(keyword, language.as_deref(), 3)
            .map_err(|e| format!("Search failed: {}", e))?;

        for pattern in patterns {
            let relevance = calculate_relevance(&context, &pattern);
            all_suggestions.push(CodeSuggestion {
                pattern,
                relevance_score: relevance,
                reason: format!("Similar to '{}'", keyword),
            });
        }
    }

    all_suggestions.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap());
    all_suggestions.truncate(5);

    Ok(all_suggestions)
}

fn calculate_relevance(context: &str, pattern: &CodePattern) -> f32 {
    let context_lower = context.to_lowercase();
    let pattern_name_lower = pattern.name.to_lowercase();

    let mut score = 0.0;

    if context_lower.contains(&pattern_name_lower) {
        score += 0.5;
    }

    score += (pattern.usage_count as f32 / 100.0).min(0.3);

    if let Some(last_used) = pattern.last_used {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let days_ago = (now - last_used) / 86400;
        score += (1.0 / (days_ago as f32 + 1.0)).min(0.2);
    }

    score.min(1.0)
}
