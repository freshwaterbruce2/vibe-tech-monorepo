use rusqlite::{params, Connection, OptionalExtension};
use std::path::{Path, PathBuf};
use tracing::{error, info};
use uuid::Uuid;

const DB_PATH: &str = "D:\\databases\\nova_shared.db";
const LEGACY_DB_PATH: &str = "D:\\databases\\database.db";

fn ensure_db_parent_dir() -> Result<(), String> {
    let path = Path::new(DB_PATH);
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid database path: {}", DB_PATH))?;
    std::fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create database directory {:?}: {}", parent, e))?;
    Ok(())
}

fn ensure_prompt_tables(conn: &Connection) -> Result<(), String> {
    let schema = "\
        CREATE TABLE IF NOT EXISTS prompt_entities (\n\
            prompt_id TEXT PRIMARY KEY,\n\
            name TEXT NOT NULL,\n\
            description TEXT,\n\
            category TEXT NOT NULL,\n\
            evolution_stage TEXT NOT NULL,\n\
            current_version TEXT NOT NULL,\n\
            created_at TEXT NOT NULL,\n\
            last_updated TEXT NOT NULL,\n\
            usage_count INTEGER DEFAULT 0,\n\
            success_rate REAL DEFAULT 0.0,\n\
            team_id TEXT,\n\
            is_public BOOLEAN DEFAULT FALSE,\n\
            is_template BOOLEAN DEFAULT FALSE\n\
        );\n\
        CREATE TABLE IF NOT EXISTS prompt_versions (\n\
            version_id TEXT PRIMARY KEY,\n\
            prompt_id TEXT NOT NULL,\n\
            content TEXT NOT NULL,\n\
            dna TEXT NOT NULL,\n\
            metrics TEXT NOT NULL,\n\
            created_at TEXT NOT NULL,\n\
            created_by TEXT NOT NULL,\n\
            parent_version TEXT,\n\
            evolution_method TEXT DEFAULT 'manual',\n\
            tags TEXT,\n\
            notes TEXT,\n\
            FOREIGN KEY (prompt_id) REFERENCES prompt_entities (prompt_id)\n\
        );";

    conn.execute_batch(schema)
        .map_err(|e| format!("Failed to ensure prompt tables: {}", e))?;
    Ok(())
}

fn fetch_prompt_content(conn: &Connection, prompt_name: &str) -> rusqlite::Result<String> {
    let query = "\
        SELECT v.content\n\
        FROM prompt_entities p\n\
        JOIN prompt_versions v ON p.current_version = v.version_id\n\
        WHERE p.name = ?1";
    let mut stmt = conn.prepare(query)?;
    stmt.query_row(params![prompt_name], |row| row.get(0))
}

fn resolve_seed_dir() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("NOVA_PROMPT_SEED_DIR") {
        let candidate = PathBuf::from(dir);
        if candidate.is_dir() {
            return Some(candidate);
        }
    }

    let hardcoded = PathBuf::from(r"C:\dev\apps\nova-agent\prompts");
    if hardcoded.is_dir() {
        return Some(hardcoded);
    }

    let exe = std::env::current_exe().ok()?;
    let mut cursor = exe.parent().map(|p| p.to_path_buf());

    for _ in 0..8 {
        let dir = cursor.as_ref()?;
        let candidate = dir.join("prompts");
        if candidate.is_dir() {
            return Some(candidate);
        }
        cursor = dir.parent().map(|p| p.to_path_buf());
    }

    None
}

fn try_seed_prompt_from_seed_files(
    prompt_name: &str,
    target_conn: &Connection,
) -> Result<bool, String> {
    let seed_dir = match resolve_seed_dir() {
        Some(dir) => dir,
        None => return Ok(false),
    };

    let seed_path = seed_dir.join(format!("{}.md", prompt_name));
    if !seed_path.exists() {
        return Ok(false);
    }

    let content = std::fs::read_to_string(&seed_path)
        .map_err(|e| format!("Failed to read prompt seed file {:?}: {}", seed_path, e))?;
    let content = content.trim();
    if content.is_empty() {
        return Err(format!("Prompt seed file is empty: {:?}", seed_path));
    }

    ensure_prompt_tables(target_conn)?;

    let now = chrono::Utc::now().to_rfc3339();
    let version_id = Uuid::new_v4().to_string();

    target_conn
        .execute(
            "\
            INSERT OR IGNORE INTO prompt_entities (\n\
                prompt_id, name, description, category, evolution_stage,\n\
                created_at, last_updated, current_version\n\
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                Uuid::new_v4().to_string(),
                prompt_name,
                "Seeded from local prompt files",
                "agent_system_prompts",
                "seed",
                now,
                now,
                version_id
            ],
        )
        .map_err(|e| format!("Prompt entity seed failed: {}", e))?;

    let prompt_id: String = target_conn
        .query_row(
            "SELECT prompt_id FROM prompt_entities WHERE name = ?1",
            params![prompt_name],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to resolve prompt_id after seed: {}", e))?;

    target_conn
        .execute(
            "\
            INSERT OR IGNORE INTO prompt_versions (\n\
                version_id, prompt_id, content, dna, metrics, created_at, created_by\n\
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                version_id,
                prompt_id,
                content,
                "{}",
                "{}",
                now,
                "nova-agent"
            ],
        )
        .map_err(|e| format!("Prompt version seed failed: {}", e))?;

    target_conn
        .execute(
            "UPDATE prompt_entities SET current_version = ?1, last_updated = ?2 WHERE name = ?3",
            params![version_id, now, prompt_name],
        )
        .map_err(|e| format!("Prompt version pointer update failed: {}", e))?;

    info!(
        "Seeded missing prompt '{}' from {:?}",
        prompt_name, seed_path
    );
    Ok(true)
}

fn try_seed_prompt_from_legacy(
    prompt_name: &str,
    target_conn: &Connection,
) -> Result<bool, String> {
    if !Path::new(LEGACY_DB_PATH).exists() {
        return Ok(false);
    }

    let legacy_conn = match Connection::open(LEGACY_DB_PATH) {
        Ok(conn) => conn,
        Err(e) => {
            error!("Legacy prompt database open failed: {}", e);
            return Ok(false);
        }
    };

    let has_entities = legacy_conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='prompt_entities'",
            [],
            |_| Ok(1i64),
        )
        .optional()
        .map_err(|e| format!("Legacy schema check failed: {}", e))?
        .is_some();

    let has_versions = legacy_conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='prompt_versions'",
            [],
            |_| Ok(1i64),
        )
        .optional()
        .map_err(|e| format!("Legacy schema check failed: {}", e))?
        .is_some();

    if !(has_entities && has_versions) {
        return Ok(false);
    }

    let entity_row = legacy_conn.query_row(
        "\
        SELECT prompt_id, name, description, category, evolution_stage, current_version,\n\
               created_at, last_updated\n\
        FROM prompt_entities\n\
        WHERE name = ?1",
        params![prompt_name],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        },
    );

    let (
        prompt_id,
        name,
        description,
        category,
        evolution_stage,
        current_version,
        created_at,
        last_updated,
    ) = match entity_row {
        Ok(row) => row,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
        Err(e) => {
            error!("Legacy prompt lookup failed: {}", e);
            return Ok(false);
        }
    };

    let version_row = legacy_conn.query_row(
        "\
        SELECT version_id, prompt_id, content, dna, metrics, created_at, created_by\n\
        FROM prompt_versions\n\
        WHERE version_id = ?1",
        params![current_version],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        },
    );

    let (version_id, version_prompt_id, content, dna, metrics, version_created_at, created_by) =
        match version_row {
            Ok(row) => row,
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
            Err(e) => {
                error!("Legacy prompt version lookup failed: {}", e);
                return Ok(false);
            }
        };

    ensure_prompt_tables(target_conn)?;

    target_conn
        .execute(
            "\
        INSERT OR IGNORE INTO prompt_entities (\n\
            prompt_id, name, description, category, evolution_stage, current_version,\n\
            created_at, last_updated\n\
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                prompt_id,
                name,
                description,
                category,
                evolution_stage,
                current_version,
                created_at,
                last_updated,
            ],
        )
        .map_err(|e| format!("Prompt entity seed failed: {}", e))?;

    target_conn
        .execute(
            "\
        INSERT OR IGNORE INTO prompt_versions (\n\
            version_id, prompt_id, content, dna, metrics, created_at, created_by\n\
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                version_id,
                version_prompt_id,
                content,
                dna,
                metrics,
                version_created_at,
                created_by,
            ],
        )
        .map_err(|e| format!("Prompt version seed failed: {}", e))?;

    target_conn
        .execute(
            "UPDATE prompt_entities SET current_version = ?1, last_updated = ?2 WHERE name = ?3",
            params![version_id, last_updated, prompt_name],
        )
        .map_err(|e| format!("Prompt version pointer update failed: {}", e))?;

    info!(
        "Seeded missing prompt '{}' from legacy database",
        prompt_name
    );
    Ok(true)
}

/// Fetches the active system prompt content for a given prompt name.
///
/// # Arguments
/// * `prompt_name` - The unique name of the prompt entity (e.g., "nova-core-v1")
///
/// # Returns
/// * `Result<String, String>` - The active prompt content or a failure reason.
pub fn fetch_system_prompt(prompt_name: &str) -> std::result::Result<String, String> {
    if let Some(seed_dir) = resolve_seed_dir() {
        let seed_path = seed_dir.join(format!("{}.md", prompt_name));
        if seed_path.exists() {
            let content = std::fs::read_to_string(&seed_path)
                .map_err(|e| format!("Failed to read prompt seed file {:?}: {}", seed_path, e))?;
            let trimmed = content.trim();
            if !trimmed.is_empty() {
                info!(
                    "Loaded prompt '{}' directly from {:?}",
                    prompt_name, seed_path
                );
                return Ok(trimmed.to_string());
            }
        }
    }

    ensure_db_parent_dir()?;

    match Connection::open(DB_PATH) {
        Ok(conn) => {
            if let Err(e) = ensure_prompt_tables(&conn) {
                error!("Failed to ensure prompt tables: {}", e);
                return Err(e);
            }

            match fetch_prompt_content(&conn, prompt_name) {
                Ok(content) => {
                    info!("Successfully fetched active prompt for '{}'", prompt_name);
                    Ok(content)
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    let seeded = try_seed_prompt_from_legacy(prompt_name, &conn)?
                        || try_seed_prompt_from_seed_files(prompt_name, &conn)?;

                    if seeded {
                        fetch_prompt_content(&conn, prompt_name).map_err(|e| {
                            format!(
                                "Prompt database missing required prompt '{}' after seed: {}",
                                prompt_name, e
                            )
                        })
                    } else {
                        Err(format!(
                            "Prompt database missing required prompt '{}'",
                            prompt_name
                        ))
                    }
                }
                Err(e) => {
                    error!(
                        "Failed to fetch content for prompt '{}': {}",
                        prompt_name, e
                    );
                    Err(format!("Prompt query failed for '{}': {}", prompt_name, e))
                }
            }
        }
        Err(e) => {
            error!("Failed to open database connection at {}: {}", DB_PATH, e);
            Err(format!("Prompt database connection failed: {}", e))
        }
    }
}

pub fn validate_required_prompts(prompt_names: &[&str]) -> Result<(), String> {
    for name in prompt_names {
        fetch_system_prompt(name)?;
    }
    Ok(())
}

pub fn require_system_prompt(prompt_name: &str) -> String {
    match fetch_system_prompt(prompt_name) {
        Ok(prompt) => prompt,
        Err(e) => {
            error!("Prompt load failure: {}", e);
            eprintln!("Prompt load failure: {}", e);
            std::process::exit(1);
        }
    }
}
