use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[path = "agent_persistence.rs"]
mod agent_persistence;
#[path = "db_migrations.rs"]
mod db_migrations;

pub use agent_persistence::{AgentTerminalInput, AgentTransitionInput, LearningOutcome};
use db_migrations::{configure_connection, run_vibe_studio_migrations};

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
}

fn get_db_path() -> Result<PathBuf, String> {
    // App-specific override ONLY. We deliberately do NOT honor the generic
    // DATABASE_PATH here: other monorepo apps consume it (vibe-invoice, vibe-justice),
    // and a stray DATABASE_PATH=...\database.db would point VCS at the wrong file,
    // splitting state from the Node backend (scripts/backend-server.js). Mirrors the
    // vibe-blox VIBEBLOX_DATABASE_PATH convention. Unset => canonical default below.
    if let Ok(env_path) = std::env::var("VCS_DATABASE_PATH") {
        if !env_path.trim().is_empty() {
            let path = PathBuf::from(env_path.trim());
            validate_windows_database_path(&path)?;
            return Ok(path);
        }
    }

    // Follow the Vibe workspace convention: durable data stays on D:\.
    // Do not silently fall back to a user-profile directory: that would split
    // state and recreate prohibited C:\Users runtime data.
    if cfg!(target_os = "windows") {
        return Ok(PathBuf::from(r"D:\databases\vibe_studio.db"));
    }
    // Fallback to user data directory
    Ok(dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("vibe-code-studio")
        .join("vibe_studio.db"))
}

fn validate_windows_database_path(path: &std::path::Path) -> Result<(), String> {
    if !cfg!(target_os = "windows") {
        return Ok(());
    }
    let normalized = path
        .to_string_lossy()
        .replace('/', "\\")
        .to_ascii_lowercase();
    if normalized.starts_with("\\\\") || normalized.starts_with(r"\\?\") {
        return Err("VCS_DATABASE_PATH cannot be a UNC or device path".into());
    }
    if normalized.split('\\').any(|segment| segment == "..") {
        return Err("VCS_DATABASE_PATH cannot contain traversal segments".into());
    }
    if !normalized.starts_with(r"d:\databases\") {
        return Err("VCS_DATABASE_PATH must remain inside D:\\databases".into());
    }
    Ok(())
}

fn ensure_connection(state: &DbState) -> Result<(), String> {
    let mut guard = state.conn.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let db_path = get_db_path()?;

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let mut conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        configure_connection(&conn)?;
        run_vibe_studio_migrations(&mut conn)?;

        *guard = Some(conn);
    }
    Ok(())
}

pub(crate) fn with_connection<T>(
    state: &DbState,
    operation: impl FnOnce(&mut Connection) -> Result<T, String>,
) -> Result<T, String> {
    ensure_connection(state)?;
    let mut guard = state.conn.lock().map_err(|error| error.to_string())?;
    let connection = guard.as_mut().ok_or("DB not initialized")?;
    operation(connection)
}

#[tauri::command]
pub fn db_record_agent_transition(
    state: State<'_, DbState>,
    input: AgentTransitionInput,
) -> Result<serde_json::Value, String> {
    agent_persistence::db_record_agent_transition(state, input)
}

#[tauri::command]
pub fn db_record_agent_terminal(
    state: State<'_, DbState>,
    input: AgentTerminalInput,
) -> Result<serde_json::Value, String> {
    agent_persistence::db_record_agent_terminal(state, input)
}

#[tauri::command]
pub fn db_get_resumable_agent_tasks(
    state: State<'_, DbState>,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    agent_persistence::db_get_resumable_agent_tasks(state, limit)
}

#[tauri::command]
pub fn db_get_agent_chat_outcomes(
    state: State<'_, DbState>,
    task_id: String,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    agent_persistence::db_get_agent_chat_outcomes(state, task_id, limit)
}

#[tauri::command]
pub fn db_flush_agent_learning_outbox(
    state: State<'_, DbState>,
) -> Result<serde_json::Value, String> {
    agent_persistence::db_flush_agent_learning_outbox(state)
}

#[tauri::command]
pub fn db_record_learning_outcome(outcome: LearningOutcome) -> Result<serde_json::Value, String> {
    agent_persistence::db_record_learning_outcome(outcome)
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
        return Err(format!("SQL statement exceeds {MAX_SQL_BYTES}-byte limit"));
    }

    // Reject statement chaining. A single trailing `;` is allowed.
    // Note: a `;` inside a string literal will also be rejected here —
    // that is intentional for defense-in-depth. Use parameter placeholders
    // (`?`) for any user-supplied values that might contain `;`.
    let no_trail = trimmed.strip_suffix(';').unwrap_or(trimmed);
    if no_trail.contains(';') {
        return Err("multiple statements are not allowed".into());
    }

    let normalized = no_trail.to_ascii_lowercase();
    for protected_table in [
        "agent_task_lifecycle",
        "agent_task_events",
        "agent_chat_outcomes",
        "agent_learning_outbox",
    ] {
        if normalized.contains(protected_table) {
            return Err(format!(
                "{protected_table} is available only through typed agent persistence commands"
            ));
        }
    }

    let verb = no_trail
        .split_whitespace()
        .next()
        .unwrap_or("")
        .to_ascii_uppercase();

    match verb.as_str() {
        "SELECT" | "WITH" => Ok(SqlKind::Read),
        "INSERT" | "UPDATE" | "DELETE" => Ok(SqlKind::Write),
        "ATTACH" | "DETACH" | "PRAGMA" | "VACUUM" | "CREATE" | "DROP" | "ALTER" | "REINDEX"
        | "BEGIN" | "COMMIT" | "ROLLBACK" | "SAVEPOINT" | "RELEASE" | "ANALYZE" => Err(format!(
            "SQL verb not permitted via db_execute_query: {verb}"
        )),
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
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec
        .iter()
        .map(|s| s as &dyn rusqlite::types::ToSql)
        .collect();

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
            assert!(validate_sql(verb).is_err(), "should reject: {verb}");
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

    #[test]
    fn protects_agent_audit_tables_from_renderer_sql() {
        assert!(validate_sql("SELECT * FROM agent_task_events").is_err());
        assert!(validate_sql("UPDATE agent_task_lifecycle SET status=? WHERE task_id=?").is_err());
        assert!(validate_sql("DELETE FROM agent_learning_outbox").is_err());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_database_override_must_stay_under_d_databases() {
        assert!(validate_windows_database_path(std::path::Path::new(
            r"D:\databases\vibe_studio.db"
        ))
        .is_ok());
        assert!(validate_windows_database_path(std::path::Path::new(
            r"C:\Users\user\vibe_studio.db"
        ))
        .is_err());
        assert!(validate_windows_database_path(std::path::Path::new(
            r"V:\monorepo\vibe_studio.db"
        ))
        .is_err());
        assert!(validate_windows_database_path(std::path::Path::new(
            r"\\server\share\vibe_studio.db"
        ))
        .is_err());
        assert!(validate_windows_database_path(std::path::Path::new(
            r"D:\databases_evil\vibe_studio.db"
        ))
        .is_err());
        assert!(
            validate_windows_database_path(std::path::Path::new(r"D:\databases\..\escape.db"))
                .is_err()
        );
    }
}
