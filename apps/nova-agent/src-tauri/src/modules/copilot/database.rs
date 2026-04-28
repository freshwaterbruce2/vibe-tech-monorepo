use super::types::{CodePattern, IndexStats};
use crate::database::connection::DatabaseService;
use rusqlite::params;
use tracing::info;

impl DatabaseService {
    /// Initialize code patterns table.
    pub fn init_copilot_tables(&self) -> rusqlite::Result<()> {
        self.learning_db.execute(
            "CREATE TABLE IF NOT EXISTS code_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type TEXT NOT NULL,
                name TEXT NOT NULL,
                code_snippet TEXT NOT NULL,
                file_path TEXT NOT NULL,
                language TEXT NOT NULL,
                imports TEXT,
                usage_count INTEGER DEFAULT 0,
                last_used INTEGER,
                tags TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(file_path, name, pattern_type)
            )",
            [],
        )?;

        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_code_patterns_language 
             ON code_patterns(language)",
            [],
        )?;

        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_code_patterns_type 
             ON code_patterns(pattern_type)",
            [],
        )?;

        self.learning_db.execute(
            "CREATE INDEX IF NOT EXISTS idx_code_patterns_name 
             ON code_patterns(name)",
            [],
        )?;

        info!("Initialized code_patterns table");
        Ok(())
    }

    /// Store a code pattern.
    pub fn store_code_pattern(&self, pattern: &CodePattern) -> rusqlite::Result<i64> {
        let mut stmt = self.learning_db.prepare(
            "INSERT OR REPLACE INTO code_patterns 
             (pattern_type, name, code_snippet, file_path, language, imports, usage_count, last_used, tags, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
        )?;

        stmt.execute(params![
            pattern.pattern_type,
            pattern.name,
            pattern.code_snippet,
            pattern.file_path,
            pattern.language,
            pattern.imports,
            pattern.usage_count,
            pattern.last_used,
            pattern.tags,
            pattern.created_at,
        ])?;

        Ok(self.learning_db.last_insert_rowid())
    }

    /// Search for similar code patterns.
    pub fn search_code_patterns(
        &self,
        query: &str,
        language: Option<&str>,
        limit: usize,
    ) -> rusqlite::Result<Vec<CodePattern>> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let mut sql = String::from(
            "SELECT id, pattern_type, name, code_snippet, file_path, language, 
                    imports, usage_count, last_used, tags, created_at
             FROM code_patterns
             WHERE name LIKE ?1 OR code_snippet LIKE ?1",
        );
        let mut bound_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let search_term = format!("%{}%", query);
        bound_values.push(Box::new(search_term.clone()));

        if let Some(lang) = language {
            sql.push_str(" AND language = ?2");
            bound_values.push(Box::new(lang.to_string()));
        }

        sql.push_str(" ORDER BY usage_count DESC, last_used DESC LIMIT ?3");
        let limit_param = i64::try_from(limit).unwrap_or(i64::MAX);
        bound_values.push(Box::new(limit_param));

        let params: Vec<&dyn rusqlite::ToSql> =
            bound_values.iter().map(|value| value.as_ref()).collect();

        let mut stmt = self.learning_db.prepare(&sql)?;
        let patterns = stmt.query_map(&params[..], |row| {
            Ok(CodePattern {
                id: row.get(0)?,
                pattern_type: row.get(1)?,
                name: row.get(2)?,
                code_snippet: row.get(3)?,
                file_path: row.get(4)?,
                language: row.get(5)?,
                imports: row.get(6)?,
                usage_count: row.get(7)?,
                last_used: row.get(8)?,
                tags: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?;

        patterns.collect()
    }

    /// Get indexing statistics.
    pub fn get_copilot_stats(&self) -> rusqlite::Result<IndexStats> {
        let total: i64 =
            self.learning_db
                .query_row("SELECT COUNT(*) FROM code_patterns", [], |row| row.get(0))?;

        let mut by_language = Vec::new();
        let mut stmt = self
            .learning_db
            .prepare("SELECT language, COUNT(*) FROM code_patterns GROUP BY language")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
        for row in rows {
            by_language.push(row?);
        }

        let mut by_type = Vec::new();
        let mut stmt = self
            .learning_db
            .prepare("SELECT pattern_type, COUNT(*) FROM code_patterns GROUP BY pattern_type")?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
        for row in rows {
            by_type.push(row?);
        }

        let last_indexed = self
            .learning_db
            .query_row("SELECT MAX(created_at) FROM code_patterns", [], |row| {
                row.get(0)
            })
            .ok();

        Ok(IndexStats {
            total_patterns: total,
            by_language,
            by_type,
            last_indexed,
        })
    }

    /// Increment usage count for a pattern.
    pub fn increment_pattern_usage(&self, pattern_id: i64) -> rusqlite::Result<()> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.learning_db.execute(
            "UPDATE code_patterns
             SET usage_count = usage_count + 1, last_used = ?1
             WHERE id = ?2",
            params![now, pattern_id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn search_code_patterns_handles_sql_injection_input() {
        let dir = tempdir().unwrap();
        let service = DatabaseService::new(dir.path().to_path_buf()).unwrap();
        service.init_copilot_tables().unwrap();

        let pattern = CodePattern {
            id: 0,
            pattern_type: "function".to_string(),
            name: "safe_search".to_string(),
            code_snippet: "fn safe_search() {}".to_string(),
            file_path: "C:\\dev\\apps\\nova-agent\\src\\safe.rs".to_string(),
            language: "rust".to_string(),
            imports: None,
            usage_count: 0,
            last_used: None,
            tags: None,
            created_at: 0,
        };

        service.store_code_pattern(&pattern).unwrap();

        let injected = service
            .search_code_patterns("' OR 1=1 --", Some("rust"), 10)
            .unwrap();
        let normal = service
            .search_code_patterns("safe_search", Some("rust"), 10)
            .unwrap();

        assert!(injected.is_empty());
        assert_eq!(normal.len(), 1);
        assert_eq!(normal[0].name, "safe_search");
    }
}
