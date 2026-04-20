use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
}

fn get_db_path() -> PathBuf {
    // Follow the Vibe workspace convention: data on D:\databases\
    if cfg!(target_os = "windows") {
        let d_path = PathBuf::from(r"D:\databases\database.db");
        if d_path.parent().map(|p| p.exists()).unwrap_or(false) {
            return d_path;
        }
    }
    // Fallback to user data directory
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vibe-code-studio")
        .join("database.db")
}

fn ensure_connection(state: &DbState) -> Result<(), String> {
    let mut guard = state.conn.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let db_path = get_db_path();

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;

        // Create strategy_memory table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS strategy_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_hash TEXT NOT NULL,
                pattern_data TEXT NOT NULL,
                success_rate REAL DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                last_used DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        *guard = Some(conn);
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct PatternRow {
    pub id: i64,
    pub pattern_hash: String,
    pub pattern_data: String,
    pub success_rate: f64,
    pub usage_count: i64,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn db_get_patterns(state: State<'_, DbState>) -> Result<serde_json::Value, String> {
    ensure_connection(&state)?;
    let guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("DB not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, pattern_hash, pattern_data, success_rate, usage_count, created_at
             FROM strategy_memory
             ORDER BY usage_count DESC, success_rate DESC
             LIMIT 100",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<PatternRow> = stmt
        .query_map([], |row| {
            Ok(PatternRow {
                id: row.get(0)?,
                pattern_hash: row.get(1)?,
                pattern_data: row.get(2)?,
                success_rate: row.get(3)?,
                usage_count: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({ "success": true, "patterns": rows }))
}

#[tauri::command]
pub fn db_save_pattern(
    state: State<'_, DbState>,
    pattern: String,
    tags: Option<String>,
) -> Result<serde_json::Value, String> {
    ensure_connection(&state)?;
    let guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("DB not initialized")?;

    let hash = format!("{:x}", fnv1a_hash(&pattern));
    let _tags = tags.unwrap_or_default();

    conn.execute(
        "INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count)
         VALUES (?1, ?2, 1.0, 1)
         ON CONFLICT(pattern_hash) DO UPDATE SET
           usage_count = usage_count + 1,
           last_used = CURRENT_TIMESTAMP",
        params![hash, pattern],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

/// Classification of a validated SQL statement.
#[derive(Debug, PartialEq, Eq)]
enum SqlKind {
    Read,
    Write,
}

/// Defense-in-depth validator for renderer-supplied SQL.
///
/// Rejects DDL (CREATE/DROP/ALTER), schema-manipulation statements
/// (ATTACH/DETACH, PRAGMA, VACUUM, REINDEX), transaction controls, and
/// multi-statement payloads. Allows only parameterised DML/DQL:
/// SELECT, WITH, INSERT, UPDATE, DELETE.
///
/// Parameter bindings are still required — validation is on the statement
/// shape, not on the data values. Consumers should continue to pass
/// user-supplied values via `query_params` (rusqlite placeholders).
fn validate_sql(sql: &str) -> Result<SqlKind, String> {
    const MAX_SQL_BYTES: usize = 16 * 1024;

    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err("SQL statement is empty".into());
    }
    if trimmed.len() > MAX_SQL_BYTES {
        return Err(format!(
            "SQL statement exceeds {MAX_SQL_BYTES}-byte limit"
        ));
    }

    // Reject statement chaining. A single trailing `;` is allowed.
    // Note: a `;` inside a string literal will also be rejected here —
    // that is intentional for defense-in-depth. Use parameter placeholders
    // (`?`) for any user-supplied values that might contain `;`.
    let no_trail = trimmed.strip_suffix(';').unwrap_or(trimmed);
    if no_trail.contains(';') {
        return Err("multiple statements are not allowed".into());
    }

    let verb = no_trail
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_uppercase();

    match verb.as_str() {
        "SELECT" | "WITH" => Ok(SqlKind::Read),
        "INSERT" | "UPDATE" | "DELETE" => Ok(SqlKind::Write),
        "ATTACH" | "DETACH" | "PRAGMA" | "VACUUM" | "CREATE" | "DROP"
        | "ALTER" | "REINDEX" | "BEGIN" | "COMMIT" | "ROLLBACK"
        | "SAVEPOINT" | "RELEASE" | "ANALYZE" => {
            Err(format!("SQL verb not permitted via db_execute_query: {verb}"))
        }
        _ => Err(format!("unrecognised SQL verb: {verb}")),
    }
}

#[tauri::command]
pub fn db_execute_query(
    state: State<'_, DbState>,
    sql: String,
    query_params: Option<Vec<String>>,
) -> Result<serde_json::Value, String> {
    let kind = validate_sql(&sql)?;

    ensure_connection(&state)?;
    let guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("DB not initialized")?;

    let params_vec = query_params.unwrap_or_default();
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();

    if kind == SqlKind::Read {
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let col_count = stmt.column_count();
        let col_names: Vec<String> = (0..col_count)
            .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
            .collect();

        let rows: Vec<serde_json::Value> = stmt
            .query_map(rusqlite::params_from_iter(&param_refs), |row| {
                let mut map = serde_json::Map::new();
                for (i, name) in col_names.iter().enumerate() {
                    let val: rusqlite::types::Value = row.get(i)?;
                    map.insert(
                        name.clone(),
                        match val {
                            rusqlite::types::Value::Null => serde_json::Value::Null,
                            rusqlite::types::Value::Integer(n) => serde_json::json!(n),
                            rusqlite::types::Value::Real(f) => serde_json::json!(f),
                            rusqlite::types::Value::Text(s) => serde_json::json!(s),
                            rusqlite::types::Value::Blob(b) => {
                                serde_json::json!(base64_encode(&b))
                            }
                        },
                    );
                }
                Ok(serde_json::Value::Object(map))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(serde_json::json!({ "success": true, "data": rows }))
    } else {
        conn.execute(&sql, rusqlite::params_from_iter(&param_refs))
            .map_err(|e| e.to_string())?;
        Ok(serde_json::json!({ "success": true }))
    }
}

/// FNV-1a hash for pattern deduplication
fn fnv1a_hash(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn base64_encode(data: &[u8]) -> String {
    use std::fmt::Write;
    let mut s = String::new();
    for byte in data {
        write!(s, "{:02x}", byte).ok();
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_select() {
        assert_eq!(validate_sql("SELECT * FROM t").unwrap(), SqlKind::Read);
        assert_eq!(validate_sql("select 1").unwrap(), SqlKind::Read);
        assert_eq!(
            validate_sql("  WITH x AS (SELECT 1) SELECT * FROM x").unwrap(),
            SqlKind::Read,
        );
    }

    #[test]
    fn allows_dml() {
        assert_eq!(
            validate_sql("INSERT INTO t(a) VALUES (?)").unwrap(),
            SqlKind::Write,
        );
        assert_eq!(
            validate_sql("UPDATE t SET a=? WHERE id=?").unwrap(),
            SqlKind::Write,
        );
        assert_eq!(
            validate_sql("DELETE FROM t WHERE id=?").unwrap(),
            SqlKind::Write,
        );
    }

    #[test]
    fn rejects_ddl_and_schema_verbs() {
        for verb in [
            "DROP TABLE t",
            "CREATE TABLE t (id INT)",
            "ALTER TABLE t ADD COLUMN c INT",
            "ATTACH DATABASE 'x.db' AS x",
            "DETACH DATABASE x",
            "PRAGMA foreign_keys=ON",
            "VACUUM",
            "REINDEX",
            "BEGIN TRANSACTION",
            "COMMIT",
            "ROLLBACK",
        ] {
            assert!(
                validate_sql(verb).is_err(),
                "should reject: {verb}"
            );
        }
    }

    #[test]
    fn rejects_multiple_statements() {
        assert!(validate_sql("SELECT 1; DROP TABLE t").is_err());
        assert!(validate_sql("INSERT INTO t VALUES (1); DELETE FROM t").is_err());
    }

    #[test]
    fn allows_single_trailing_semicolon() {
        assert_eq!(validate_sql("SELECT 1;").unwrap(), SqlKind::Read);
    }

    #[test]
    fn rejects_empty_and_whitespace() {
        assert!(validate_sql("").is_err());
        assert!(validate_sql("   \t\n").is_err());
    }

    #[test]
    fn rejects_oversize_statement() {
        let big = "SELECT ".to_string() + &"a,".repeat(10_000);
        assert!(validate_sql(&big).is_err());
    }

    #[test]
    fn rejects_load_extension_pragma() {
        assert!(validate_sql("PRAGMA load_extension('evil.dll')").is_err());
    }
}
