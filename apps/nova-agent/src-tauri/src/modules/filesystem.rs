use crate::modules::path_policy;
use serde::Serialize;
use tracing::{debug, info};

const MAX_FILE_BYTES: usize = 1024 * 1024;
const MAX_TEXT_EXTENSION_LEN: usize = 64;
const ALLOWED_EXTENSIONS: [&str; 24] = [
    "txt",
    "md",
    "json",
    "toml",
    "yaml",
    "yml",
    "rs",
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "css",
    "html",
    "htm",
    "py",
    "c",
    "cpp",
    "h",
    "hpp",
    "sh",
    "ps1",
    "bat",
    "cmd",
];

#[derive(Serialize)]
pub struct WriteResult {
    pub path: String,
    pub bytes_written: usize,
    pub line_count: usize,
}

fn validate_path_input(raw_path: &str) -> Result<std::path::PathBuf, String> {
    if raw_path.len() > MAX_TEXT_EXTENSION_LEN * 16 {
        return Err("Path too long".to_string());
    }
    path_policy::validate_existing_path(raw_path)
}

fn validate_writable_path(raw_path: &str) -> Result<std::path::PathBuf, String> {
    if raw_path.len() > MAX_TEXT_EXTENSION_LEN * 16 {
        return Err("Path too long".to_string());
    }
    path_policy::validate_writable_path(raw_path)
}

fn validate_directory_input(raw_path: &str) -> Result<std::path::PathBuf, String> {
    if raw_path.trim().is_empty() {
        return Err("Directory path cannot be empty".to_string());
    }
    path_policy::validate_directory_path(raw_path)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    debug!("Reading file: {}", path);

    let path = validate_path_input(&path)?;

    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    if contents.len() > MAX_FILE_BYTES {
        return Err("File too large to read through invoke".to_string());
    }

    info!("Successfully read file: {}", path.display());
    Ok(contents)
}

#[tauri::command]
pub async fn write_file(path: String, contents: String) -> Result<WriteResult, String> {
    debug!("Writing to file: {}", path);

    let path = validate_writable_path(&path)?;
    path_policy::validate_allowed_extension(
        path.to_string_lossy().as_ref(),
        &ALLOWED_EXTENSIONS,
    )?;

    if contents.len() > MAX_FILE_BYTES {
        return Err("Payload too large for write operation".to_string());
    }

    let bytes_written = contents.len();
    let line_count = contents.lines().count();

    tokio::fs::write(&path, &contents)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    info!(
        "Wrote {} bytes to {} with {} lines",
        bytes_written,
        path.display(),
        line_count
    );

    Ok(WriteResult {
        path: path.to_string_lossy().to_string(),
        bytes_written,
        line_count,
    })
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<String, String> {
    debug!("Listing directory: {}", path);

    let path = validate_directory_input(&path)?;

    let mut entries = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("Failed to read dir: {}", e))?;
    let mut result = Vec::new();

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to iterate dir: {}", e))?
    {
        let ft = entry.file_type().await.map_err(|e| {
            format!("Failed to get file type for {}: {}", entry.path().display(), e)
        })?;

        result.push(serde_json::json!({
            "name": entry.file_name().to_string_lossy(),
            "is_dir": ft.is_dir(),
            "is_file": ft.is_file(),
        }));
    }

    Ok(serde_json::to_string_pretty(&result).unwrap_or_else(|_| "[]".to_string()))
}
