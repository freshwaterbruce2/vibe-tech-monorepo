use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use tracing::{debug, info};

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStatus {
    pub branch: String,
    pub modified_files: Vec<String>,
    pub staged_files: Vec<String>,
    pub behind: u32,
    pub ahead: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileContext {
    pub path: String,
    pub language: String,
    pub last_modified: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectContext {
    pub name: String,
    pub path: String,
    pub project_type: String, // e.g., "rust", "typescript", "python"
    pub has_package_json: bool,
    pub has_cargo_toml: bool,
    pub has_pyproject: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemContext {
    pub timestamp: u64,
    pub workspace_root: String,
    pub git_status: Option<GitStatus>,
    pub active_processes: Vec<String>,
    pub current_project: Option<ProjectContext>,
    pub recent_files: Vec<FileContext>,
    pub deep_work_minutes: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityEvent {
    pub event_type: String,
    pub timestamp: u64,
    pub details: String,
    pub context: Option<String>,
}

pub struct ContextEngine {
    workspace_root: String,
    session_start: u64,
    #[allow(dead_code)]
    activity_log: Vec<ActivityEvent>,
}

impl ContextEngine {
    pub fn new(workspace_root: String) -> Self {
        let session_start = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        info!(
            "ContextEngine initialized for workspace: {}",
            workspace_root
        );

        Self {
            workspace_root,
            session_start,
            activity_log: Vec::new(),
        }
    }

    /// Log an activity event for tracking
    #[allow(dead_code)]
    pub fn log_activity(&mut self, event_type: &str, details: &str, context: Option<&str>) {
        let event = ActivityEvent {
            event_type: event_type.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            details: details.to_string(),
            context: context.map(|s| s.to_string()),
        };

        debug!("Activity logged: {} - {}", event_type, details);
        self.activity_log.push(event);
    }

    /// Get recent activity events
    #[allow(dead_code)]
    pub fn get_recent_activity(&self, limit: usize) -> Vec<&ActivityEvent> {
        self.activity_log.iter().rev().take(limit).collect()
    }

    /// Calculate deep work minutes based on activity
    pub fn calculate_deep_work_minutes(&self) -> u32 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Simple calculation: minutes since session start
        // In a full implementation, this would track focused coding time
        ((now - self.session_start) / 60) as u32
    }

    /// Get a full context snapshot
    pub fn get_snapshot(&self) -> SystemContext {
        self.get_snapshot_with_deep_work(self.calculate_deep_work_minutes())
    }

    /// Get a context snapshot with supplied deep work minutes
    pub fn get_snapshot_with_deep_work(&self, deep_work_minutes: u32) -> SystemContext {
        let git_status = self.collect_git_status();
        let current_project = self.detect_project();
        let recent_files = self.get_recent_files();
        let active_processes = self.get_dev_processes();

        SystemContext {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            workspace_root: self.workspace_root.clone(),
            git_status,
            active_processes,
            current_project,
            recent_files,
            deep_work_minutes,
        }
    }

    /// Detect the current project type from workspace
    fn detect_project(&self) -> Option<ProjectContext> {
        let path = Path::new(&self.workspace_root);
        if !path.exists() {
            return None;
        }

        let has_package_json = path.join("package.json").exists();
        let has_cargo_toml = path.join("Cargo.toml").exists();
        let has_pyproject = path.join("pyproject.toml").exists() || path.join("setup.py").exists();

        let project_type = if has_cargo_toml {
            "rust"
        } else if has_package_json {
            "typescript"
        } else if has_pyproject {
            "python"
        } else {
            "unknown"
        };

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        Some(ProjectContext {
            name,
            path: self.workspace_root.clone(),
            project_type: project_type.to_string(),
            has_package_json,
            has_cargo_toml,
            has_pyproject,
        })
    }

    /// Get recently modified files in the workspace
    fn get_recent_files(&self) -> Vec<FileContext> {
        let mut files = Vec::new();
        let path = Path::new(&self.workspace_root);

        if !path.exists() {
            return files;
        }

        // Get recently modified files from git
        let mut command = Command::new("git");
        command
            .args(["diff", "--name-only", "HEAD~5", "HEAD"])
            .current_dir(path);

        #[cfg(target_os = "windows")]
        command.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = command.output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for file_path in stdout.lines().take(10) {
                    let language = Self::detect_language(file_path);
                    files.push(FileContext {
                        path: file_path.to_string(),
                        language,
                        last_modified: 0, // Could be enhanced with actual mtime
                    });
                }
            }
        }

        files
    }

    /// Detect programming language from file extension
    fn detect_language(file_path: &str) -> String {
        let ext = Path::new(file_path)
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        match ext.as_str() {
            "rs" => "rust",
            "ts" | "tsx" => "typescript",
            "js" | "jsx" => "javascript",
            "py" => "python",
            "go" => "go",
            "java" => "java",
            "cs" => "csharp",
            "cpp" | "cc" | "cxx" => "cpp",
            "c" | "h" => "c",
            "md" => "markdown",
            "json" => "json",
            "yaml" | "yml" => "yaml",
            "toml" => "toml",
            "sql" => "sql",
            "html" => "html",
            "css" | "scss" | "sass" => "css",
            _ => "unknown",
        }
        .to_string()
    }

    /// Get running development-related processes
    fn get_dev_processes(&self) -> Vec<String> {
        let mut processes = Vec::new();

        #[cfg(target_os = "windows")]
        {
            let mut command = Command::new("tasklist");
            command.args(["/FO", "CSV", "/NH"]);
            command.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = command.output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let dev_tools = [
                        "code.exe",
                        "node.exe",
                        "cargo.exe",
                        "rustc.exe",
                        "python.exe",
                        "npm.exe",
                        "pnpm.exe",
                        "git.exe",
                        "nvim.exe",
                        "vim.exe",
                    ];

                    for line in stdout.lines() {
                        for tool in &dev_tools {
                            if line.to_lowercase().contains(&tool.to_lowercase()) {
                                if !processes.contains(&tool.to_string()) {
                                    processes.push(tool.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        processes
    }

    fn collect_git_status(&self) -> Option<GitStatus> {
        let path = Path::new(&self.workspace_root);
        if !path.exists() {
            return None;
        }

        // Get Branch
        let mut branch_cmd = Command::new("git");
        branch_cmd
            .arg("rev-parse")
            .arg("--abbrev-ref")
            .arg("HEAD")
            .current_dir(path);

        #[cfg(target_os = "windows")]
        branch_cmd.creation_flags(CREATE_NO_WINDOW);

        let branch = branch_cmd.output().ok().and_then(|output| {
            if output.status.success() {
                Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
            } else {
                None
            }
        })?;

        // Get Status (porcelain)
        let mut status_cmd = Command::new("git");
        status_cmd
            .arg("status")
            .arg("--porcelain")
            .current_dir(path);

        #[cfg(target_os = "windows")]
        status_cmd.creation_flags(CREATE_NO_WINDOW);

        let status_output = status_cmd.output().ok()?;

        let mut modified = Vec::new();
        let mut staged = Vec::new();

        if status_output.status.success() {
            let output = String::from_utf8_lossy(&status_output.stdout);
            for line in output.lines() {
                if line.len() >= 2 {
                    let code = &line[0..2];
                    let file = line[3..].to_string();

                    // XY format: X = staged, Y = unstaged
                    if code.chars().nth(0).unwrap() != ' ' && code.chars().nth(0).unwrap() != '?' {
                        staged.push(file.clone());
                    }
                    if code.chars().nth(1).unwrap() != ' ' {
                        modified.push(file);
                    }
                }
            }
        }

        // Get ahead/behind counts
        let (ahead, behind) = self.get_ahead_behind(&path);

        Some(GitStatus {
            branch,
            modified_files: modified,
            staged_files: staged,
            behind,
            ahead,
        })
    }

    /// Get commits ahead/behind remote
    fn get_ahead_behind(&self, path: &Path) -> (u32, u32) {
        let mut command = Command::new("git");
        command
            .args(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
            .current_dir(path);

        #[cfg(target_os = "windows")]
        command.creation_flags(CREATE_NO_WINDOW);

        let output = command.output();

        match output {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let parts: Vec<&str> = stdout.trim().split_whitespace().collect();
                if parts.len() == 2 {
                    let ahead = parts[0].parse().unwrap_or(0);
                    let behind = parts[1].parse().unwrap_or(0);
                    return (ahead, behind);
                }
            }
            _ => {
                debug!("Could not get ahead/behind counts (may not have upstream)");
            }
        }

        (0, 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_language_detection() {
        assert_eq!(ContextEngine::detect_language("main.rs"), "rust");
        assert_eq!(ContextEngine::detect_language("index.tsx"), "typescript");
        assert_eq!(ContextEngine::detect_language("script.py"), "python");
        assert_eq!(ContextEngine::detect_language("README.md"), "markdown");
    }

    #[test]
    fn test_context_engine_creation() {
        let engine = ContextEngine::new("C:\\dev".to_string());
        assert_eq!(engine.workspace_root, "C:\\dev");
    }
}
