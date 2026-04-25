use crate::modules::state::Config;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, SystemTime};
use tauri::State;
use tracing::{debug, info};
use walkdir::{DirEntry, WalkDir};

const DEFAULT_ALLOWED_ROOTS: [&str; 3] = ["D:\\logs", "D:\\data", "D:\\learning-system"];
const DEFAULT_EXCLUDE_DIRS: [&str; 6] =
    [".git", "node_modules", "target", ".venv", "dist", "build"];
const MAX_SAMPLE_PATHS: usize = 50;

#[derive(Debug, Deserialize)]
pub struct CleanRequest {
    pub root: String,
    pub max_age_days: u64,
    pub dry_run: Option<bool>,
    pub max_delete_mb: Option<u64>,
    pub include_extensions: Option<Vec<String>>,
    pub exclude_dirs: Option<Vec<String>>,
    pub max_files: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct CleanResult {
    pub root: String,
    pub dry_run: bool,
    pub candidates: u64,
    pub deleted: u64,
    pub skipped: u64,
    pub bytes_deleted: u64,
    pub sample_deleted: Vec<String>,
    pub errors: Vec<String>,
    pub stopped_early: bool,
}

fn normalize_path(path: &Path) -> Result<String, String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
    Ok(canonical.to_string_lossy().to_lowercase())
}

fn validate_root(root: &Path, allowlist: &[PathBuf]) -> Result<PathBuf, String> {
    if !root.is_absolute() {
        return Err("Root path must be absolute".to_string());
    }

    if root.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err("Root path cannot contain parent directory components".to_string());
    }

    if !root.exists() || !root.is_dir() {
        return Err("Root path must exist and be a directory".to_string());
    }

    let root_norm = normalize_path(root)?;
    let mut allowed = false;

    for allowed_root in allowlist {
        if let Ok(allowed_norm) = normalize_path(allowed_root) {
            if root_norm.starts_with(&allowed_norm) {
                allowed = true;
                break;
            }
        }
    }

    if !allowed {
        return Err("Root path is not in the allowlist".to_string());
    }

    Ok(root.to_path_buf())
}

fn build_allowlist(config: &Config) -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = DEFAULT_ALLOWED_ROOTS
        .iter()
        .map(|p| PathBuf::from(p))
        .collect();

    if !config.trading_logs_dir.is_empty() {
        roots.push(PathBuf::from(&config.trading_logs_dir));
    }
    if !config.trading_data_dir.is_empty() {
        roots.push(PathBuf::from(&config.trading_data_dir));
    }

    roots
}

fn build_exclude_set(extra: &Option<Vec<String>>) -> HashSet<String> {
    let mut set: HashSet<String> = DEFAULT_EXCLUDE_DIRS
        .iter()
        .map(|s| s.to_lowercase())
        .collect();

    if let Some(extra_dirs) = extra {
        for item in extra_dirs {
            set.insert(item.to_lowercase());
        }
    }

    set
}

fn should_exclude_dir(entry: &DirEntry, exclude: &HashSet<String>) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    let name = entry.file_name().to_string_lossy().to_lowercase();
    exclude.contains(&name)
}

fn build_extension_set(exts: &Option<Vec<String>>) -> Option<HashSet<String>> {
    exts.as_ref().map(|items| {
        items
            .iter()
            .map(|ext| ext.trim_start_matches('.').to_lowercase())
            .filter(|ext| !ext.is_empty())
            .collect::<HashSet<String>>()
    })
}

fn extension_allowed(path: &Path, include: &Option<HashSet<String>>) -> bool {
    match include {
        None => true,
        Some(set) => path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| set.contains(&ext.to_lowercase()))
            .unwrap_or(false),
    }
}

fn run_clean(request: CleanRequest, allowlist: Vec<PathBuf>) -> Result<CleanResult, String> {
    let root_path = PathBuf::from(&request.root);
    let validated_root = validate_root(&root_path, &allowlist)?;

    let dry_run = request.dry_run.unwrap_or(true);
    let max_age = Duration::from_secs(request.max_age_days.saturating_mul(86400));
    let max_delete_bytes = request
        .max_delete_mb
        .map(|mb| mb.saturating_mul(1024 * 1024));
    let include_exts = build_extension_set(&request.include_extensions);
    let exclude_dirs = build_exclude_set(&request.exclude_dirs);
    let max_files = request.max_files.unwrap_or(5000);

    let mut candidates = 0u64;
    let mut deleted = 0u64;
    let mut skipped = 0u64;
    let mut bytes_deleted = 0u64;
    let mut sample_deleted = Vec::new();
    let mut errors = Vec::new();
    let mut stopped_early = false;

    let walker = WalkDir::new(&validated_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !should_exclude_dir(entry, &exclude_dirs));

    let now = SystemTime::now();

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                errors.push(format!("Walk error: {}", e));
                continue;
            }
        };

        if !entry.file_type().is_file() {
            continue;
        }

        if !extension_allowed(entry.path(), &include_exts) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(e) => {
                errors.push(format!("Metadata error: {}", e));
                continue;
            }
        };

        let modified = match metadata.modified() {
            Ok(m) => m,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };

        let age = now.duration_since(modified).unwrap_or_default();
        if age < max_age {
            continue;
        }

        candidates += 1;
        if candidates > max_files {
            stopped_early = true;
            break;
        }

        let size = metadata.len();
        if let Some(max_bytes) = max_delete_bytes {
            if bytes_deleted.saturating_add(size) > max_bytes {
                skipped += 1;
                continue;
            }
        }

        if dry_run {
            deleted += 1;
            bytes_deleted = bytes_deleted.saturating_add(size);
            if sample_deleted.len() < MAX_SAMPLE_PATHS {
                sample_deleted.push(entry.path().to_string_lossy().to_string());
            }
            continue;
        }

        match std::fs::remove_file(entry.path()) {
            Ok(()) => {
                deleted += 1;
                bytes_deleted = bytes_deleted.saturating_add(size);
                if sample_deleted.len() < MAX_SAMPLE_PATHS {
                    sample_deleted.push(entry.path().to_string_lossy().to_string());
                }
            }
            Err(e) => {
                skipped += 1;
                errors.push(format!("Delete failed: {}", e));
            }
        }
    }

    info!(
        "File cleanup completed: root={}, dry_run={}, deleted={}, bytes={}",
        validated_root.to_string_lossy(),
        dry_run,
        deleted,
        bytes_deleted
    );

    Ok(CleanResult {
        root: validated_root.to_string_lossy().to_string(),
        dry_run,
        candidates,
        deleted,
        skipped,
        bytes_deleted,
        sample_deleted,
        errors,
        stopped_early,
    })
}

#[tauri::command]
pub async fn clean_old_files(
    request: CleanRequest,
    config: State<'_, Config>,
) -> Result<CleanResult, String> {
    debug!("Running file cleaner");

    let allowlist = build_allowlist(&config);

    let result = tokio::task::spawn_blocking(move || run_clean(request, allowlist))
        .await
        .map_err(|e| format!("File cleaner task failed: {}", e))??;

    Ok(result)
}
