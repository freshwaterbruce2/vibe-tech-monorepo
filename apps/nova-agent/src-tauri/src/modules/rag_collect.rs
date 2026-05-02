use std::path::{Path, PathBuf};

const MAX_INDEX_DEPTH: usize = 16;
const MAX_INDEX_FILES: usize = 10_000;
const MAX_INDEX_TOTAL_BYTES: u64 = 250 * 1024 * 1024;

/// Directories skipped during recursive indexing.
const SKIP_DIRS: &[&str] = &["node_modules", ".git", "target", "dist", ".nx", ".cache"];

pub(super) fn collect_files(dir: &Path, extensions: &[String]) -> Result<Vec<PathBuf>, String> {
    let extensions = extensions
        .iter()
        .map(|ext| ext.trim_start_matches('.').to_ascii_lowercase())
        .filter(|ext| !ext.is_empty())
        .collect::<Vec<_>>();

    let mut files = Vec::new();
    let mut total_bytes = 0u64;
    collect_files_inner(dir, &extensions, 0, &mut files, &mut total_bytes)?;
    Ok(files)
}

fn collect_files_inner(
    dir: &Path,
    extensions: &[String],
    depth: usize,
    files: &mut Vec<PathBuf>,
    total_bytes: &mut u64,
) -> Result<(), String> {
    if depth > MAX_INDEX_DEPTH {
        return Ok(());
    }

    let entries =
        std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory {:?}: {e}", dir))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to read file type for {:?}: {e}", path))?;

        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if SKIP_DIRS.contains(&name) {
                    continue;
                }
            }
            collect_files_inner(&path, extensions, depth + 1, files, total_bytes)?;
        } else if file_type.is_file() {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            if extensions.is_empty() || extensions.contains(&ext) {
                push_bounded_file(
                    &path,
                    entry
                        .metadata()
                        .map_err(|e| format!("Failed to read metadata for {:?}: {e}", path))?
                        .len(),
                    files,
                    total_bytes,
                )?;
            }
        }
    }

    Ok(())
}

fn push_bounded_file(
    path: &Path,
    len: u64,
    files: &mut Vec<PathBuf>,
    total_bytes: &mut u64,
) -> Result<(), String> {
    if files.len() >= MAX_INDEX_FILES {
        return Err(format!(
            "Directory index limit exceeded: maximum {} files",
            MAX_INDEX_FILES
        ));
    }

    if (*total_bytes).saturating_add(len) > MAX_INDEX_TOTAL_BYTES {
        return Err(format!(
            "Directory index limit exceeded: maximum {} bytes",
            MAX_INDEX_TOTAL_BYTES
        ));
    }

    *total_bytes = (*total_bytes).saturating_add(len);
    files.push(path.to_path_buf());
    Ok(())
}
