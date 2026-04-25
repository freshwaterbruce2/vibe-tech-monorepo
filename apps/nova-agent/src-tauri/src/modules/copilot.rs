/// Personal Codebase Copilot
/// Indexes and suggests code patterns from user's own codebase
///
/// Features:
/// - Scans codebase for functions, classes, patterns
/// - Suggests similar code based on context
/// - Learns from user's coding style
/// - Privacy-focused (all local, no external API)
use crate::database::connection::DatabaseService;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::{debug, info, warn};
use walkdir::WalkDir;

// ==========================================
// Types
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodePattern {
    pub id: i64,
    pub pattern_type: String, // "function", "class", "hook", "component", etc.
    pub name: String,         // Function/class name
    pub code_snippet: String, // The actual code
    pub file_path: String,    // Where it's from
    pub language: String,     // "typescript", "rust", "python", etc.
    pub imports: Option<String>, // Comma-separated imports
    pub usage_count: i32,     // How many times user has used this pattern
    pub last_used: Option<i64>, // Timestamp
    pub tags: Option<String>, // Comma-separated tags
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSuggestion {
    pub pattern: CodePattern,
    pub relevance_score: f32, // 0.0 - 1.0
    pub reason: String,       // Why this is suggested
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStats {
    pub total_patterns: i64,
    pub by_language: Vec<(String, i64)>,
    pub by_type: Vec<(String, i64)>,
    pub last_indexed: Option<i64>,
}

// ==========================================
// Database Operations
// ==========================================

impl DatabaseService {
    /// Initialize code patterns table
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

        // Index for fast lookups
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

    /// Store a code pattern
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

    /// Search for similar code patterns
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

    /// Get indexing statistics
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

    /// Increment usage count for a pattern
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

// ==========================================
// Codebase Indexer
// ==========================================

/// Index a codebase directory
pub fn index_codebase(
    db: &DatabaseService,
    root_path: &str,
    max_files: usize,
) -> Result<usize, String> {
    info!("Starting codebase indexing at: {}", root_path);

    let root = PathBuf::from(root_path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", root_path));
    }

    let mut indexed_count = 0;
    let mut file_count = 0;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if file_count >= max_files {
            warn!("Reached max files limit: {}", max_files);
            break;
        }

        let path = entry.path();

        // Skip non-files and hidden directories
        if !path.is_file()
            || path.to_string_lossy().contains("/.")
            || path.to_string_lossy().contains("\\.")
        {
            continue;
        }

        // Skip common build/dependency directories
        let path_str = path.to_string_lossy();
        if should_skip_directory(&path_str) {
            continue;
        }

        // Determine language from extension
        let language = match path.extension().and_then(|s| s.to_str()) {
            Some("ts") | Some("tsx") => "typescript",
            Some("js") | Some("jsx") => "javascript",
            Some("rs") => "rust",
            Some("py") => "python",
            Some("go") => "go",
            Some("java") => "java",
            Some("cpp") | Some("cc") | Some("cxx") => "cpp",
            Some("c") => "c",
            Some("cs") => "csharp",
            _ => continue, // Skip unsupported files
        };

        file_count += 1;

        // Read file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                debug!("Failed to read {}: {}", path_str, e);
                continue;
            }
        };

        // Extract patterns based on language
        let patterns = extract_patterns(&content, language, &path_str);

        for pattern in patterns {
            match db.store_code_pattern(&pattern) {
                Ok(_) => indexed_count += 1,
                Err(e) => debug!("Failed to store pattern: {}", e),
            }
        }
    }

    info!(
        "Indexed {} patterns from {} files",
        indexed_count, file_count
    );
    Ok(indexed_count)
}

/// Extract code patterns from file content
fn extract_patterns(content: &str, language: &str, file_path: &str) -> Vec<CodePattern> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let mut patterns = Vec::new();

    match language {
        "typescript" | "javascript" => {
            patterns.extend(extract_ts_patterns(content, language, file_path, now));
        }
        "rust" => {
            patterns.extend(extract_rust_patterns(content, file_path, now));
        }
        "python" => {
            patterns.extend(extract_python_patterns(content, file_path, now));
        }
        _ => {}
    }

    patterns
}

// ==========================================
// Language-Specific Pattern Extractors
// ==========================================

/// Extract TypeScript/JavaScript patterns
fn extract_ts_patterns(
    content: &str,
    language: &str,
    file_path: &str,
    timestamp: i64,
) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    // Extract imports
    let imports = content
        .lines()
        .filter(|line| line.trim().starts_with("import "))
        .map(|line| line.trim().to_string())
        .collect::<Vec<_>>()
        .join(", ");

    let imports_opt = if imports.is_empty() {
        None
    } else {
        Some(imports)
    };

    // Extract functions (simple regex-based approach)
    for line in content.lines() {
        let trimmed = line.trim();

        // Function declarations: function foo() or const foo = () =>
        if let Some(name) = extract_function_name(trimmed) {
            // Get the full function (simplified - just get a few lines)
            let snippet = get_code_snippet(content, trimmed, 10);

            patterns.push(CodePattern {
                id: 0,
                pattern_type: "function".to_string(),
                name: name.to_string(),
                code_snippet: snippet,
                file_path: file_path.to_string(),
                language: language.to_string(),
                imports: imports_opt.clone(),
                usage_count: 0,
                last_used: None,
                tags: None,
                created_at: timestamp,
            });
        }

        // React components: export const MyComponent = () =>
        if trimmed.contains("export") && (trimmed.contains("const") || trimmed.contains("function"))
        {
            if let Some(name) = extract_component_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "component".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: language.to_string(),
                    imports: imports_opt.clone(),
                    usage_count: 0,
                    last_used: None,
                    tags: Some("react".to_string()),
                    created_at: timestamp,
                });
            }
        }

        // Custom hooks: export const useMyHook = () =>
        if trimmed.contains("use") && trimmed.contains("=") {
            if let Some(name) = extract_hook_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 12);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "hook".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: language.to_string(),
                    imports: imports_opt.clone(),
                    usage_count: 0,
                    last_used: None,
                    tags: Some("react,hook".to_string()),
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

/// Extract Rust patterns
fn extract_rust_patterns(content: &str, file_path: &str, timestamp: i64) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Functions: pub fn foo() or fn foo()
        if trimmed.starts_with("pub fn ") || trimmed.starts_with("fn ") {
            if let Some(name) = extract_rust_function_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "function".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "rust".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }

        // Structs: pub struct Foo or struct Foo
        if trimmed.starts_with("pub struct ") || trimmed.starts_with("struct ") {
            if let Some(name) = extract_rust_struct_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 10);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "struct".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "rust".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

/// Extract Python patterns
fn extract_python_patterns(content: &str, file_path: &str, timestamp: i64) -> Vec<CodePattern> {
    let mut patterns = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // Functions: def foo():
        if trimmed.starts_with("def ") {
            if let Some(name) = extract_python_function_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 12);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "function".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "python".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }

        // Classes: class Foo:
        if trimmed.starts_with("class ") {
            if let Some(name) = extract_python_class_name(trimmed) {
                let snippet = get_code_snippet(content, trimmed, 15);

                patterns.push(CodePattern {
                    id: 0,
                    pattern_type: "class".to_string(),
                    name: name.to_string(),
                    code_snippet: snippet,
                    file_path: file_path.to_string(),
                    language: "python".to_string(),
                    imports: None,
                    usage_count: 0,
                    last_used: None,
                    tags: None,
                    created_at: timestamp,
                });
            }
        }
    }

    patterns
}

// ==========================================
// Helper Functions
// ==========================================

/// Check if a directory should be skipped during indexing
fn should_skip_directory(path: &str) -> bool {
    let skip_patterns = [
        // Package managers
        "node_modules",
        "bower_components",
        "jspm_packages",
        "vendor",
        "packages",
        // Build outputs
        "dist",
        "build",
        "out",
        ".next",
        ".nuxt",
        ".output",
        "target",
        "bin",
        "obj",
        // Caches
        ".cache",
        ".parcel-cache",
        ".turbo",
        ".webpack",
        ".vite",
        "coverage",
        ".nyc_output",
        // Version control
        ".git",
        ".svn",
        ".hg",
        // IDEs
        ".vscode",
        ".idea",
        ".vs",
        // OS
        ".DS_Store",
        "Thumbs.db",
        // Logs
        "logs",
        "*.log",
        // Temp
        "tmp",
        "temp",
        ".tmp",
        // Test coverage
        "htmlcov",
        ".pytest_cache",
        "__pycache__",
        // Rust specific
        "target/debug",
        "target/release",
        // Python specific
        ".venv",
        "venv",
        "env",
        ".env",
        "site-packages",
        // Ruby specific
        ".bundle",
        // Java specific
        ".gradle",
        ".m2",
        // .NET specific
        "packages",
        "TestResults",
    ];

    skip_patterns.iter().any(|pattern| path.contains(pattern))
}

/// Get a code snippet starting from a specific line
fn get_code_snippet(content: &str, start_line: &str, max_lines: usize) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let start_idx = lines.iter().position(|&l| l.trim() == start_line);

    if let Some(idx) = start_idx {
        let end_idx = (idx + max_lines).min(lines.len());
        lines[idx..end_idx].join("\n")
    } else {
        start_line.to_string()
    }
}

/// Extract function name from TypeScript/JavaScript line
fn extract_function_name(line: &str) -> Option<String> {
    // function foo() or const foo = () =>
    if line.starts_with("function ") {
        line.split_whitespace()
            .nth(1)
            .and_then(|s| s.split('(').next())
            .map(|s| s.to_string())
    } else if line.contains("const ") && line.contains("=") {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

/// Extract component name from React export
fn extract_component_name(line: &str) -> Option<String> {
    if line.contains("export") && line.contains("const") {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .map(|s| s.trim().to_string())
    } else if line.contains("export function") {
        line.split("function ")
            .nth(1)
            .and_then(|s| s.split('(').next())
            .map(|s| s.trim().to_string())
    } else {
        None
    }
}

/// Extract hook name from React hook
fn extract_hook_name(line: &str) -> Option<String> {
    if line.contains("const use") || line.contains("export const use") {
        line.split("const ")
            .nth(1)
            .and_then(|s| s.split('=').next())
            .and_then(|s| {
                let name = s.trim();
                if name.starts_with("use") {
                    Some(name.to_string())
                } else {
                    None
                }
            })
    } else {
        None
    }
}

/// Extract Rust function name
fn extract_rust_function_name(line: &str) -> Option<String> {
    line.split("fn ")
        .nth(1)
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}

/// Extract Rust struct name
fn extract_rust_struct_name(line: &str) -> Option<String> {
    line.split("struct ")
        .nth(1)
        .and_then(|s| s.split_whitespace().next())
        .map(|s| s.trim().to_string())
}

/// Extract Python function name
fn extract_python_function_name(line: &str) -> Option<String> {
    line.split("def ")
        .nth(1)
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}

/// Extract Python class name
fn extract_python_class_name(line: &str) -> Option<String> {
    line.split("class ")
        .nth(1)
        .and_then(|s| s.split(':').next())
        .and_then(|s| s.split('(').next())
        .map(|s| s.trim().to_string())
}

// ==========================================
// Tauri Commands
// ==========================================

use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

/// Index the codebase
#[tauri::command]
pub async fn index_codebase_command(
    root_path: String,
    max_files: Option<usize>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<String, String> {
    info!("Indexing codebase: {}", root_path);

    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    // Initialize tables if needed
    db_service
        .init_copilot_tables()
        .map_err(|e| format!("Failed to init tables: {}", e))?;

    let count = index_codebase(db_service, &root_path, max_files.unwrap_or(1000))?;

    Ok(format!("Indexed {} code patterns", count))
}

/// Search for code patterns
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

/// Get copilot statistics
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

/// Mark a pattern as used
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

/// Get suggestions based on current context
#[tauri::command]
pub async fn get_suggestions(
    context: String,
    language: Option<String>,
    db: State<'_, Arc<AsyncMutex<Option<DatabaseService>>>>,
) -> Result<Vec<CodeSuggestion>, String> {
    let db_guard = db.lock().await;
    let db_service = db_guard.as_ref().ok_or("Database not initialized")?;

    // Extract keywords from context
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

    // Sort by relevance and deduplicate
    all_suggestions.sort_by(|a, b| b.relevance_score.partial_cmp(&a.relevance_score).unwrap());
    all_suggestions.truncate(5);

    Ok(all_suggestions)
}

/// Calculate relevance score between context and pattern
fn calculate_relevance(context: &str, pattern: &CodePattern) -> f32 {
    let context_lower = context.to_lowercase();
    let pattern_name_lower = pattern.name.to_lowercase();

    let mut score = 0.0;

    // Name match
    if context_lower.contains(&pattern_name_lower) {
        score += 0.5;
    }

    // Usage count (normalized)
    score += (pattern.usage_count as f32 / 100.0).min(0.3);

    // Recency (normalized)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::connection::DatabaseService;
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
