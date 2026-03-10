use std::{
    env,
    path::{Component, Path, PathBuf},
};

const DEFAULT_WORKSPACE_ROOT: &str = "C:\\dev";
const MAX_PATH_LENGTH: usize = 4096;
const MAX_TEMPLATE_NAME_LEN: usize = 128;

fn normalize_root(raw_root: &str) -> Option<PathBuf> {
    let trimmed = raw_root.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.len() > MAX_PATH_LENGTH {
        return None;
    }

    if trimmed.contains('\0') {
        return None;
    }

    let root = Path::new(trimmed);
    if !root.is_absolute() {
        return None;
    }

    if has_traversal_pattern(trimmed) {
        return None;
    }

    let canonical = root
        .canonicalize()
        .or_else(|_| Ok::<PathBuf, std::io::Error>(root.to_path_buf()))
        .ok()?;

    if !canonical.exists() || !canonical.is_dir() {
        return None;
    }

    Some(canonical)
}

fn has_traversal_pattern(raw: &str) -> bool {
    if raw.is_empty() {
        return false;
    }

    let lowered = raw.to_lowercase();
    if lowered.contains("%2f") || lowered.contains("%5c") || lowered.contains("%2e") {
        return true;
    }

    Path::new(raw)
        .components()
        .any(|c| matches!(c, Component::ParentDir))
}

fn is_within_root(path: &Path, root: &Path) -> bool {
    let path_str = path
        .to_string_lossy()
        .replace('/', "\\")
        .to_lowercase();
    let root_str = root
        .to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase();

    if path_str == root_str {
        return true;
    }

    let prefix = format!("{}\\", root_str);
    path_str.starts_with(&prefix)
}

fn validate_root_policy_input(raw: &str) -> Result<(), String> {
    if raw.len() > MAX_PATH_LENGTH {
        return Err("Path value exceeds maximum length".to_string());
    }

    if raw.contains('\0') {
        return Err("Path contains invalid NUL character".to_string());
    }

    if raw
        .chars()
        .any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r') {
        return Err("Path contains control characters".to_string());
    }

    if has_traversal_pattern(raw) {
        return Err("Path traversal pattern detected".to_string());
    }

    Ok(())
}

pub fn load_allowed_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(roots_env) = env::var("NOVA_ALLOWED_ROOTS") {
        for raw_root in roots_env
            .split([';', ','])
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
        {
            if let Some(root) = normalize_root(raw_root) {
                roots.push(root);
            }
        }
    }

    let workspace_root = env::var("WORKSPACE_ROOT").unwrap_or_else(|_| DEFAULT_WORKSPACE_ROOT.to_string());
    if let Some(root) = normalize_root(&workspace_root) {
        roots.push(root);
    }

    if roots.is_empty() {
        if let Some(root) = normalize_root(DEFAULT_WORKSPACE_ROOT) {
            roots.push(root);
        }
    }

    roots.sort();
    roots.dedup();
    roots
}

fn validate_absolute_path(raw: &str) -> Result<PathBuf, String> {
    validate_root_policy_input(raw)?;

    let path = Path::new(raw);
    if !path.is_absolute() {
        return Err("Path must be absolute".to_string());
    }

    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path '{}': {}", raw, e))?;

    Ok(canonical)
}

fn enforce_allowed_roots(path: &Path) -> Result<(), String> {
    let allowed_roots = load_allowed_roots();
    if !allowed_roots
        .iter()
        .any(|root| is_within_root(path, root))
    {
        return Err(format!(
            "Access denied: path '{}' is outside configured workspace roots",
            path.display()
        ));
    }

    Ok(())
}

#[allow(dead_code)]
pub fn allowed_roots() -> Vec<PathBuf> {
    load_allowed_roots()
}

pub fn validate_existing_path(raw: &str) -> Result<PathBuf, String> {
    let path = validate_absolute_path(raw)?;
    enforce_allowed_roots(&path)?;

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    Ok(path)
}

pub fn validate_writable_path(raw: &str) -> Result<PathBuf, String> {
    let path = validate_absolute_path(raw)?;
    enforce_allowed_roots(&path)?;

    if let Some(parent) = path.parent() {
        let parent = parent
            .canonicalize()
            .map_err(|e| {
                format!(
                    "Failed to resolve parent path '{}': {}",
                    parent.display(),
                    e
                )
            })?;

        if !parent.exists() {
            return Err("Parent directory does not exist".to_string());
        }
    }

    Ok(path)
}

pub fn validate_directory_path(raw: &str) -> Result<PathBuf, String> {
    let path = validate_absolute_path(raw)?;
    enforce_allowed_roots(&path)?;

    if !path.is_dir() {
        return Err(format!("Not a directory: {}", path.display()));
    }

    Ok(path)
}

pub fn validate_template_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }

    if name.len() > MAX_TEMPLATE_NAME_LEN {
        return Err("Name is too long".to_string());
    }

    if name == "." || name == ".." {
        return Err("Invalid name".to_string());
    }

    if name
        .chars()
        .any(|c| c.is_control() || c == '/' || c == '\\' || c == ':')
    {
        return Err("Invalid characters in name".to_string());
    }

    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err("Name contains invalid characters".to_string());
    }

    Ok(name.to_string())
}

pub fn validate_allowed_extension(path: &str, allowed: &[&str]) -> Result<(), String> {
    let extension = Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    if extension.is_empty() {
        return Ok(());
    }

    if allowed
        .iter()
        .any(|allowed_ext| allowed_ext.eq_ignore_ascii_case(extension))
    {
        Ok(())
    } else {
        Err(format!("Unsupported file extension: .{}", extension))
    }
}

pub fn validate_project_output_root(raw: &str) -> Result<PathBuf, String> {
    validate_directory_path(raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn traversal_patterns_are_rejected() {
        assert!(has_traversal_pattern(r"..\secrets.txt"));
        assert!(has_traversal_pattern("../secrets.txt"));
        assert!(has_traversal_pattern("%2e%2e%5csecrets.txt"));
        assert!(!has_traversal_pattern(r"C:\dev\apps\nova-agent"));
    }

    #[test]
    fn template_names_are_strict() {
        assert!(validate_template_name("nova-agent").is_ok());
        assert!(validate_template_name("..").is_err());
        assert!(validate_template_name("bad/name").is_err());
        assert!(validate_template_name("bad:name").is_err());
    }

    #[test]
    fn within_root_check_is_prefix_safe() {
        let root = Path::new(r"C:\dev");
        assert!(is_within_root(Path::new(r"C:\dev\apps\nova-agent"), root));
        assert!(!is_within_root(Path::new(r"C:\developer\other"), root));
        assert!(!is_within_root(Path::new(r"D:\other"), root));
    }
}
