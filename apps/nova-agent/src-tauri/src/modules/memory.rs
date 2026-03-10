//! Persistent Memory System for Nova Agent
//! 4-level hierarchy: Working → Short-term → Long-term → Semantic

use crate::database::DatabaseService;
use crate::modules::state::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, info};

/// Memory types for categorization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MemoryType {
    Conversation,
    Fact,
    Preference,
    Project,
    Task,
    Pattern,
    Activity,
    Decision,
    Error,
}

impl std::fmt::Display for MemoryType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemoryType::Conversation => write!(f, "conversation"),
            MemoryType::Fact => write!(f, "fact"),
            MemoryType::Preference => write!(f, "preference"),
            MemoryType::Project => write!(f, "project"),
            MemoryType::Task => write!(f, "task"),
            MemoryType::Pattern => write!(f, "pattern"),
            MemoryType::Activity => write!(f, "activity"),
            MemoryType::Decision => write!(f, "decision"),
            MemoryType::Error => write!(f, "error"),
        }
    }
}

impl MemoryType {
    fn parse(value: &str) -> Option<Self> {
        match value.to_lowercase().as_str() {
            "conversation" => Some(MemoryType::Conversation),
            "fact" => Some(MemoryType::Fact),
            "preference" => Some(MemoryType::Preference),
            "project" => Some(MemoryType::Project),
            "task" => Some(MemoryType::Task),
            "pattern" => Some(MemoryType::Pattern),
            "activity" => Some(MemoryType::Activity),
            "decision" => Some(MemoryType::Decision),
            "error" => Some(MemoryType::Error),
            _ => None,
        }
    }
}

/// Memory entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub id: String,
    pub memory_type: String,
    pub content: String,
    pub context: Option<String>,
    pub importance: f32,        // 0.0 to 1.0
    pub access_count: u32,
    pub created_at: u64,
    pub last_accessed: u64,
    pub expires_at: Option<u64>, // None = permanent
    pub tags: Vec<String>,
}

/// Search result with relevance score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySearchResult {
    pub memory: Memory,
    pub relevance: f32,
}

/// Memory service for persistent storage operations
pub struct MemoryService {
    db: Arc<AsyncMutex<Option<DatabaseService>>>,
}

fn normalize_memory_type(memory_type: &str) -> Option<String> {
    MemoryType::parse(memory_type).map(|value| value.to_string())
}

fn is_valid_memory_type(memory_type: &str) -> bool {
    normalize_memory_type(memory_type).is_some()
}

impl MemoryService {
    pub fn new(db: Arc<AsyncMutex<Option<DatabaseService>>>) -> Self {
        Self { db }
    }

    /// Store a new memory
    pub async fn store(&self, memory: Memory) -> Result<String, String> {
        if !is_valid_memory_type(&memory.memory_type) {
            return Err("Invalid memory type".to_string());
        }

        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.store_memory(&memory).map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }

    /// Search memories by text query
    pub async fn search(&self, query: &str, limit: Option<u32>) -> Result<Vec<MemorySearchResult>, String> {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.search_memories(query, limit.unwrap_or(10))
                .map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }

    /// Get memory by ID
    pub async fn get(&self, id: &str) -> Result<Option<Memory>, String> {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.get_memory(id).map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }

    /// Update memory importance/access
    pub async fn touch(&self, id: &str) -> Result<(), String> {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.touch_memory(id).map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }

    /// Archive old memories (move to long-term)
    pub async fn consolidate(&self) -> Result<u32, String> {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.consolidate_memories().map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }

    /// Remove expired short-term memories
    pub async fn prune(&self) -> Result<u32, String> {
        let db_guard = self.db.lock().await;
        if let Some(service) = db_guard.as_ref() {
            service.prune_memories().map_err(|e| e.to_string())
        } else {
            Err("Database service not available".to_string())
        }
    }
}

// === Tauri Commands ===

#[tauri::command]
pub async fn search_memories(
    query: String, 
    limit: Option<u32>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
    _state: State<'_, AppState>,
) -> Result<Vec<MemorySearchResult>, String> {
    debug!("Searching memories for: {}", query);
    
    let service = MemoryService::new(Arc::clone(&db));
    let results = service.search(&query, limit).await?;
    
    info!("Found {} memory results for: {}", results.len(), query);
    Ok(results)
}

#[tauri::command]
pub async fn store_memory(
    content: String,
    memory_type: String,
    context: Option<String>,
    importance: Option<f32>,
    tags: Option<Vec<String>>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<String, String> {
    let memory_type = normalize_memory_type(&memory_type)
        .ok_or_else(|| "Invalid memory type".to_string())?;

    debug!(
        "Storing memory: {} ({})",
        &content[..content.len().min(50)],
        memory_type
    );

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let memory = Memory {
        id: uuid::Uuid::new_v4().to_string(),
        memory_type,
        content,
        context,
        importance: importance.unwrap_or(0.5),
        access_count: 0,
        created_at: now,
        last_accessed: now,
        expires_at: None,
        tags: tags.unwrap_or_default(),
    };
    
    let service = MemoryService::new(Arc::clone(&db));
    let id = service.store(memory).await?;
    
    info!("Memory stored with id: {}", id);
    Ok(id)
}

#[tauri::command]
pub async fn get_memory(
    id: String,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<Option<Memory>, String> {
    debug!("Getting memory: {}", id);
    
    let service = MemoryService::new(Arc::clone(&db));
    let memory = service.get(&id).await?;
    if memory.is_some() {
        if let Err(e) = service.touch(&id).await {
            info!("Failed to update memory access: {}", e);
        }
    }
    Ok(memory)
}

#[tauri::command]
pub async fn get_memories_by_type(
    memory_type: String,
    limit: Option<u32>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<Vec<Memory>, String> {
    debug!("Getting memories by type: {}", memory_type);
    
    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        service.get_memories_by_type(&memory_type, limit.unwrap_or(20))
            .map_err(|e| e.to_string())
    } else {
        Err("Database service not available".to_string())
    }
}

#[tauri::command]
pub async fn consolidate_memories(
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<u32, String> {
    info!("Consolidating memories...");
    
    let service = MemoryService::new(Arc::clone(&db));
    let count = service.consolidate().await?;
    
    info!("Consolidated {} memories", count);
    Ok(count)
}

#[tauri::command]
pub async fn prune_memories(
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<u32, String> {
    info!("Pruning expired memories...");
    
    let service = MemoryService::new(Arc::clone(&db));
    let count = service.prune().await?;
    
    info!("Pruned {} expired memories", count);
    Ok(count)
}

#[derive(Debug, Serialize)]
pub struct MemoryOverview {
    pub count: u64,
    pub recent: Vec<Memory>,
}

/// Return memory count and most recent entries for UI surfacing
#[tauri::command]
pub async fn get_memory_overview(
    limit: Option<u32>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<MemoryOverview, String> {
    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        let count = service.get_memory_count().map_err(|e| e.to_string())?;
        let recent = service
            .get_recent_memories(limit.unwrap_or(5))
            .map_err(|e| e.to_string())?;

        Ok(MemoryOverview { count, recent })
    } else {
        Err("Database service not available".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::DatabaseService;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::Arc;
    use tokio::sync::Mutex as AsyncMutex;

    #[tokio::test]
    async fn memory_store_search_touch_prune() {
        let base = std::env::temp_dir().join("nova_memory_test");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();

        let db = DatabaseService::new(PathBuf::from(&base)).unwrap();
        db.init_memory_tables().unwrap();

        let service = MemoryService::new(Arc::new(AsyncMutex::new(Some(db))));
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let memory = Memory {
            id: uuid::Uuid::new_v4().to_string(),
            memory_type: "fact".to_string(),
            content: "hello world".to_string(),
            context: Some("test".to_string()),
            importance: 0.5,
            access_count: 0,
            created_at: now,
            last_accessed: now,
            expires_at: None,
            tags: vec!["unit".to_string()],
        };

        let id = service.store(memory).await.unwrap();
        let results = service.search("hello", Some(5)).await.unwrap();
        assert!(!results.is_empty());

        service.touch(&id).await.unwrap();
        let pruned = service.prune().await.unwrap();
        assert_eq!(0, pruned);
    }

    #[tokio::test]
    async fn rejects_invalid_memory_type() {
        let base = std::env::temp_dir().join("nova_memory_test_invalid");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();

        let db = DatabaseService::new(PathBuf::from(&base)).unwrap();
        db.init_memory_tables().unwrap();

        let service = MemoryService::new(Arc::new(AsyncMutex::new(Some(db))));
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let memory = Memory {
            id: uuid::Uuid::new_v4().to_string(),
            memory_type: "invalid".to_string(),
            content: "bad type".to_string(),
            context: None,
            importance: 0.5,
            access_count: 0,
            created_at: now,
            last_accessed: now,
            expires_at: None,
            tags: vec![],
        };

        let result = service.store(memory).await;
        assert!(result.is_err());
    }
}
