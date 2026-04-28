use super::extractors::extract_patterns;
use crate::database::connection::DatabaseService;
use std::path::PathBuf;
use tracing::{debug, info, warn};
use walkdir::WalkDir;

/// Index a codebase directory.
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

        if !path.is_file()
            || path.to_string_lossy().contains("/.")
            || path.to_string_lossy().contains("\\.")
        {
            continue;
        }

        let path_str = path.to_string_lossy();
        if should_skip_directory(&path_str) {
            continue;
        }

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
            _ => continue,
        };

        file_count += 1;

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                debug!("Failed to read {}: {}", path_str, e);
                continue;
            }
        };

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

fn should_skip_directory(path: &str) -> bool {
    let skip_patterns = [
        "node_modules",
        "bower_components",
        "jspm_packages",
        "vendor",
        "packages",
        "dist",
        "build",
        "out",
        ".next",
        ".nuxt",
        ".output",
        "target",
        "bin",
        "obj",
        ".cache",
        ".parcel-cache",
        ".turbo",
        ".webpack",
        ".vite",
        "coverage",
        ".nyc_output",
        ".git",
        ".svn",
        ".hg",
        ".vscode",
        ".idea",
        ".vs",
        ".DS_Store",
        "Thumbs.db",
        "logs",
        "*.log",
        "tmp",
        "temp",
        ".tmp",
        "htmlcov",
        ".pytest_cache",
        "__pycache__",
        "target/debug",
        "target/release",
        ".venv",
        "venv",
        "env",
        ".env",
        "site-packages",
        ".bundle",
        ".gradle",
        ".m2",
        "TestResults",
    ];

    skip_patterns.iter().any(|pattern| path.contains(pattern))
}
