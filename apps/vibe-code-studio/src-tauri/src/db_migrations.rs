use rusqlite::{params, Connection, OptionalExtension, Transaction};

pub const CONNECTION_PRAGMAS: &str =
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;";

const VIBE_CORE_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS strategy_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_hash TEXT UNIQUE NOT NULL,
    pattern_data TEXT NOT NULL,
    success_rate REAL DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS agent_schedules (
    id TEXT PRIMARY KEY,
    definition_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    artifact_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS artifact_comments (
    id TEXT PRIMARY KEY,
    artifact_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    comment_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    item_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS app_state (
    state_key TEXT PRIMARY KEY,
    state_value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"#;

const AGENT_LIFECYCLE_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS agent_task_lifecycle (
    task_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN (
        'planning','executing','awaiting_approval','completed','failed','cancelled'
    )),
    user_request TEXT NOT NULL,
    workspace_root TEXT NOT NULL,
    task_data TEXT NOT NULL,
    current_step_index INTEGER NOT NULL DEFAULT 0,
    model_metadata TEXT,
    changed_files TEXT,
    validation_summary TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    terminal_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_task_lifecycle_status_updated
    ON agent_task_lifecycle(status, updated_at DESC);
CREATE TABLE IF NOT EXISTS agent_chat_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK(outcome IN ('completed','failed','cancelled')),
    summary TEXT NOT NULL,
    changed_files TEXT,
    validation_summary TEXT,
    model_metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES agent_task_lifecycle(task_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_chat_outcomes_task
    ON agent_chat_outcomes(task_id, created_at DESC);
"#;

const AGENT_EVENT_OUTBOX_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS agent_task_events (
    event_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN (
        'planning','executing','awaiting_approval','completed','failed','cancelled'
    )),
    event_type TEXT NOT NULL,
    step_id TEXT,
    proposal_id TEXT,
    proposal_hash TEXT,
    path TEXT,
    change_type TEXT,
    reason_code TEXT,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES agent_task_lifecycle(task_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_task_events_task_created
    ON agent_task_events(task_id, created_at ASC);
CREATE TABLE IF NOT EXISTS agent_learning_outbox (
    task_id TEXT PRIMARY KEY,
    outcome TEXT NOT NULL CHECK(outcome IN ('completed','failed','cancelled')),
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_learning_outbox_pending
    ON agent_learning_outbox(delivered_at, created_at ASC);
"#;

const LEARNING_EXECUTION_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS agent_executions (
    execution_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    task_type TEXT,
    tools_used TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    success BOOLEAN DEFAULT TRUE,
    execution_time_ms INTEGER,
    error_message TEXT,
    metadata TEXT,
    context TEXT,
    project_name TEXT,
    tokens_used INTEGER,
    selected_model TEXT,
    agent_name TEXT,
    execution_time INTEGER,
    error_details TEXT,
    created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_executions_started ON agent_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_agent_task
    ON agent_executions(agent_id, task_type);
"#;

pub fn configure_connection(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(CONNECTION_PRAGMAS)
        .map_err(|error| error.to_string())
}

pub fn run_vibe_studio_migrations(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vcs_schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|error| error.to_string())?;

    for (name, sql) in [
        ("vcs_001_core_state", VIBE_CORE_SCHEMA),
        ("vcs_002_agent_lifecycle", AGENT_LIFECYCLE_SCHEMA),
        ("vcs_003_agent_events_outbox", AGENT_EVENT_OUTBOX_SCHEMA),
    ] {
        apply_sql_migration(conn, "vcs_schema_migrations", name, sql)?;
    }
    Ok(())
}

pub fn run_learning_migrations(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS vcs_learning_schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|error| error.to_string())?;
    apply_sql_migration(
        conn,
        "vcs_learning_schema_migrations",
        "vcs_learning_001_agent_execution_sink",
        LEARNING_EXECUTION_SCHEMA,
    )?;

    if !migration_applied(
        conn,
        "vcs_learning_schema_migrations",
        "vcs_learning_002_execution_telemetry_columns",
    )? {
        let tx = conn.transaction().map_err(|error| error.to_string())?;
        ensure_learning_columns(&tx)?;
        tx.execute(
            "INSERT INTO vcs_learning_schema_migrations(name, applied_at)
             VALUES (?1, CURRENT_TIMESTAMP)",
            params!["vcs_learning_002_execution_telemetry_columns"],
        )
        .map_err(|error| error.to_string())?;
        tx.commit().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn apply_sql_migration(
    conn: &mut Connection,
    registry: &str,
    name: &str,
    sql: &str,
) -> Result<(), String> {
    if migration_applied(conn, registry, name)? {
        return Ok(());
    }
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    tx.execute_batch(sql).map_err(|error| error.to_string())?;
    let insert = match registry {
        "vcs_schema_migrations" => {
            "INSERT INTO vcs_schema_migrations(name, applied_at) VALUES (?1, CURRENT_TIMESTAMP)"
        }
        "vcs_learning_schema_migrations" => {
            "INSERT INTO vcs_learning_schema_migrations(name, applied_at)
             VALUES (?1, CURRENT_TIMESTAMP)"
        }
        _ => return Err("unknown migration registry".into()),
    };
    tx.execute(insert, params![name])
        .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())
}

fn migration_applied(conn: &Connection, registry: &str, name: &str) -> Result<bool, String> {
    let query = match registry {
        "vcs_schema_migrations" => "SELECT 1 FROM vcs_schema_migrations WHERE name=?1",
        "vcs_learning_schema_migrations" => {
            "SELECT 1 FROM vcs_learning_schema_migrations WHERE name=?1"
        }
        _ => return Err("unknown migration registry".into()),
    };
    conn.query_row(query, params![name], |_| Ok(()))
        .optional()
        .map(|value| value.is_some())
        .map_err(|error| error.to_string())
}

fn ensure_learning_columns(tx: &Transaction<'_>) -> Result<(), String> {
    let columns = learning_columns(tx)?;
    for (name, ddl) in [
        (
            "tokens_used",
            "ALTER TABLE agent_executions ADD COLUMN tokens_used INTEGER",
        ),
        (
            "selected_model",
            "ALTER TABLE agent_executions ADD COLUMN selected_model TEXT",
        ),
        (
            "agent_name",
            "ALTER TABLE agent_executions ADD COLUMN agent_name TEXT",
        ),
        (
            "execution_time",
            "ALTER TABLE agent_executions ADD COLUMN execution_time INTEGER",
        ),
        (
            "error_details",
            "ALTER TABLE agent_executions ADD COLUMN error_details TEXT",
        ),
        (
            "created_at",
            "ALTER TABLE agent_executions ADD COLUMN created_at INTEGER",
        ),
    ] {
        if !columns.iter().any(|column| column == name) {
            tx.execute_batch(ddl).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn learning_columns(conn: &Connection) -> Result<Vec<String>, String> {
    let mut statement = conn
        .prepare("PRAGMA table_info(agent_executions)")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_named_and_idempotent() {
        let mut connection = Connection::open_in_memory().unwrap();
        configure_connection(&connection).unwrap();
        run_vibe_studio_migrations(&mut connection).unwrap();
        run_vibe_studio_migrations(&mut connection).unwrap();
        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM vcs_schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        let busy_timeout: i64 = connection
            .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
        assert_eq!(busy_timeout, 5000);
    }

    #[test]
    fn learning_migration_adds_missing_telemetry_columns() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(
                "CREATE TABLE agent_executions (
                    execution_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    task_type TEXT,
                    tools_used TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    success BOOLEAN,
                    execution_time_ms INTEGER,
                    error_message TEXT,
                    metadata TEXT,
                    context TEXT,
                    project_name TEXT
                );",
            )
            .unwrap();
        configure_connection(&connection).unwrap();
        run_learning_migrations(&mut connection).unwrap();
        run_learning_migrations(&mut connection).unwrap();
        let columns = learning_columns(&connection).unwrap();
        assert!(columns.iter().any(|column| column == "selected_model"));
        assert!(columns.iter().any(|column| column == "tokens_used"));
    }
}
