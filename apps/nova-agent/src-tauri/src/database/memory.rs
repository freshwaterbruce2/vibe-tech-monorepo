//! Memory database operations

use crate::database::connection::DatabaseService;
use crate::database::errors::DatabaseError;
use crate::modules::memory::{Memory, MemorySearchResult};
use rusqlite::params;
use tracing::{debug, info};

impl DatabaseService {
    /// Initialize memory tables
    pub fn init_memory_tables(&self) -> Result<(), DatabaseError> {
        self.learning_db.execute(
            "CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                memory_type TEXT NOT NULL,
                content TEXT NOT NULL,
                context TEXT,
                importance REAL DEFAULT 0.5,
                access_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                last_accessed INTEGER NOT NULL,
                expires_at INTEGER,
                tags TEXT,
                archived INTEGER DEFAULT 0
            )",
            [],
        )?;

        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type)",
            [],
        )?;
        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC)",
            [],
        )?;
        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed DESC)",
            [],
        )?;

        info!("Memory tables initialized");
        Ok(())
    }

    /// Store a new memory
    pub fn store_memory(&self, memory: &Memory) -> Result<String, DatabaseError> {
        let tags_json = serde_json::to_string(&memory.tags).unwrap_or_else(|_| "[]".to_string());
        
        self.learning_db.execute(
            "INSERT INTO memories (id, memory_type, content, context, importance, access_count, created_at, last_accessed, expires_at, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                memory.id,
                memory.memory_type,
                memory.content,
                memory.context,
                memory.importance,
                memory.access_count,
                memory.created_at,
                memory.last_accessed,
                memory.expires_at,
                tags_json,
            ],
        )?;

        debug!("Stored memory: {}", memory.id);
        Ok(memory.id.clone())
    }

    /// Search memories by text query (simple LIKE search)
    pub fn search_memories(&self, query: &str, limit: u32) -> Result<Vec<MemorySearchResult>, DatabaseError> {
        let search_pattern = format!("%{}%", query.to_lowercase());
        
        let mut stmt = self.learning_db.prepare(
            "SELECT id, memory_type, content, context, importance, access_count, created_at, last_accessed, expires_at, tags
             FROM memories
             WHERE archived = 0 AND (LOWER(content) LIKE ?1 OR LOWER(context) LIKE ?1 OR LOWER(tags) LIKE ?1)
             ORDER BY importance DESC, last_accessed DESC
             LIMIT ?2"
        )?;

        let results = stmt.query_map(params![search_pattern, limit], |row| {
            let tags_json: String = row.get(9)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            Ok(MemorySearchResult {
                memory: Memory {
                    id: row.get(0)?,
                    memory_type: row.get(1)?,
                    content: row.get(2)?,
                    context: row.get(3)?,
                    importance: row.get(4)?,
                    access_count: row.get(5)?,
                    created_at: row.get(6)?,
                    last_accessed: row.get(7)?,
                    expires_at: row.get(8)?,
                    tags,
                },
                relevance: 1.0, // Simple search doesn't compute relevance
            })
        })?;

        let mut memories = Vec::new();
        for result in results {
            memories.push(result?);
        }

        debug!("Found {} memories matching '{}'", memories.len(), query);
        Ok(memories)
    }

    /// Get memory by ID
    pub fn get_memory(&self, id: &str) -> Result<Option<Memory>, DatabaseError> {
        let mut stmt = self.learning_db.prepare(
            "SELECT id, memory_type, content, context, importance, access_count, created_at, last_accessed, expires_at, tags
             FROM memories WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            let tags_json: String = row.get(9)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            Ok(Memory {
                id: row.get(0)?,
                memory_type: row.get(1)?,
                content: row.get(2)?,
                context: row.get(3)?,
                importance: row.get(4)?,
                access_count: row.get(5)?,
                created_at: row.get(6)?,
                last_accessed: row.get(7)?,
                expires_at: row.get(8)?,
                tags,
            })
        });

        match result {
            Ok(memory) => Ok(Some(memory)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DatabaseError::from(e)),
        }
    }

    /// Get memories by type
    pub fn get_memories_by_type(&self, memory_type: &str, limit: u32) -> Result<Vec<Memory>, DatabaseError> {
        let mut stmt = self.learning_db.prepare(
            "SELECT id, memory_type, content, context, importance, access_count, created_at, last_accessed, expires_at, tags
             FROM memories
             WHERE memory_type = ?1 AND archived = 0
             ORDER BY importance DESC, last_accessed DESC
             LIMIT ?2"
        )?;

        let results = stmt.query_map(params![memory_type, limit], |row| {
            let tags_json: String = row.get(9)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            Ok(Memory {
                id: row.get(0)?,
                memory_type: row.get(1)?,
                content: row.get(2)?,
                context: row.get(3)?,
                importance: row.get(4)?,
                access_count: row.get(5)?,
                created_at: row.get(6)?,
                last_accessed: row.get(7)?,
                expires_at: row.get(8)?,
                tags,
            })
        })?;

        let mut memories = Vec::new();
        for result in results {
            memories.push(result?);
        }

        Ok(memories)
    }

    /// Update memory access time and count
    pub fn touch_memory(&self, id: &str) -> Result<(), DatabaseError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.learning_db.execute(
            "UPDATE memories SET access_count = access_count + 1, last_accessed = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        Ok(())
    }

    /// Archive old, low-importance memories
    pub fn consolidate_memories(&self) -> Result<u32, DatabaseError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        // Archive memories older than 7 days with low importance and low access
        let seven_days_ago = now - (7 * 24 * 60 * 60);
        
        let count = self.learning_db.execute(
            "UPDATE memories SET archived = 1 
             WHERE archived = 0 
               AND last_accessed < ?1 
               AND importance < 0.3 
               AND access_count < 3",
            params![seven_days_ago],
        )?;

        info!("Consolidated {} memories", count);
        Ok(count as u32)
    }

    /// Delete expired memories
    pub fn prune_memories(&self) -> Result<u32, DatabaseError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let count = self.learning_db.execute(
            "DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at < ?1",
            params![now],
        )?;

        info!("Pruned {} expired memories", count);
        Ok(count as u32)
    }

    /// Count non-archived memories
    pub fn get_memory_count(&self) -> Result<u64, DatabaseError> {
        let count: u64 = self
            .learning_db
            .query_row("SELECT COUNT(*) FROM memories WHERE archived = 0", [], |row| {
                row.get(0)
            })?;
        Ok(count)
    }

    /// Get most recently accessed memories
    pub fn get_recent_memories(&self, limit: u32) -> Result<Vec<Memory>, DatabaseError> {
        let mut stmt = self.learning_db.prepare(
            "SELECT id, memory_type, content, context, importance, access_count, created_at, last_accessed, expires_at, tags
             FROM memories
             WHERE archived = 0
             ORDER BY last_accessed DESC
             LIMIT ?1",
        )?;

        let results = stmt.query_map(params![limit], |row| {
            let tags_json: String = row.get(9)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(Memory {
                id: row.get(0)?,
                memory_type: row.get(1)?,
                content: row.get(2)?,
                context: row.get(3)?,
                importance: row.get(4)?,
                access_count: row.get(5)?,
                created_at: row.get(6)?,
                last_accessed: row.get(7)?,
                expires_at: row.get(8)?,
                tags,
            })
        })?;

        let mut memories = Vec::new();
        for result in results {
            memories.push(result?);
        }

        Ok(memories)
    }
}
