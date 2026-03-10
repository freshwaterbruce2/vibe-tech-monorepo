use crate::database;
use crate::modules::path_policy;
use crate::modules::state::Config;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;
use tracing::{debug, error, info};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub project_type: String,
    pub command: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub project_type: String,
    pub has_state: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectStateFile {
    current_phase: String,
    next_steps: Vec<String>,
    blockers: Vec<String>,
    decisions: Vec<String>,
    last_updated: String,
}

impl ProjectStateFile {
    fn new(project_type: &str) -> Self {
        let next_steps = match project_type {
            "node" | "typescript" => vec![
                "Run 'npm install' or 'pnpm install'".to_string(),
                "Setup Git repository".to_string(),
                "Configure linting".to_string(),
            ],
            "python" => vec![
                "Create virtual environment".to_string(),
                "Install dependencies".to_string(),
            ],
            "rust" => vec![
                "Build project with 'cargo build'".to_string(),
                "Run tests".to_string(),
            ],
            _ => vec!["Initialize project".to_string()],
        };

        Self {
            current_phase: "setup".to_string(),
            next_steps,
            blockers: vec![],
            decisions: vec![format!("Selected {} as primary technology", project_type)],
            last_updated: Utc::now().to_rfc3339(),
        }
    }
}

fn get_project_templates() -> Vec<ProjectTemplate> {
    vec![
        ProjectTemplate {
            id: "nx-react".to_string(),
            name: "React Application (Nx)".to_string(),
            description: "Create a new React application using Nx".to_string(),
            project_type: "typescript".to_string(),
            command: "pnpm".to_string(),
            args: vec!["nx".to_string(), "g".to_string(), "@nx/react:app".to_string()],
        },
        ProjectTemplate {
            id: "nx-node".to_string(),
            name: "Node.js Application (Nx)".to_string(),
            description: "Create a new Node.js application using Nx".to_string(),
            project_type: "typescript".to_string(),
            command: "pnpm".to_string(),
            args: vec!["nx".to_string(), "g".to_string(), "@nx/node:app".to_string()],
        },
        ProjectTemplate {
            id: "rust-bin".to_string(),
            name: "Rust Binary".to_string(),
            description: "Create a new Rust binary project".to_string(),
            project_type: "rust".to_string(),
            command: "cargo".to_string(),
            args: vec!["new".to_string()],
        },
        ProjectTemplate {
            id: "python-project".to_string(),
            name: "Python Project".to_string(),
            description: "Create a new Python project with uv".to_string(),
            project_type: "python".to_string(),
            command: "uv".to_string(),
            args: vec!["init".to_string()],
        },
    ]
}

#[tauri::command]
pub async fn get_available_templates() -> Result<Vec<ProjectTemplate>, String> {
    Ok(get_project_templates())
}

#[tauri::command]
pub async fn get_project_state(
    project_path: String,
) -> Result<ProjectStateFile, String> {
    let path = path_policy::validate_directory_path(&project_path)?;
    let state_path = path.join("project_state.json");

    let content = tokio::fs::read_to_string(&state_path)
        .await
        .map_err(|e| format!("Failed to read state file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse state file: {}", e))
}

#[tauri::command]
pub async fn create_project(
    template_id: String,
    name: String,
    path: String,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
    config: State<'_, Config>,
) -> Result<serde_json::Value, String> {
    let safe_name = path_policy::validate_template_name(&name)?;
    let templates = get_project_templates();
    let template = templates
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("Unknown template: {}", template_id))?;

    let base_path = if path.trim().is_empty() {
        path_policy::validate_project_output_root(&config.workspace_root)?
    } else {
        path_policy::validate_project_output_root(&path)?
    };

    let project_path = base_path.join(&safe_name);

    if project_path.exists() {
        return Err(format!("Project already exists at {}", project_path.display()));
    }

    std::fs::create_dir_all(&project_path)
        .map_err(|e| format!("Failed to create project path: {}", e))?;

    let mut args = template.args.clone();
    args.push(safe_name.clone());

    if !path.trim().is_empty() {
        match template.project_type.as_str() {
            "rust" => {}
            "python" => {}
            _ => args.push(format!("--directory={}", project_path.to_string_lossy())),
        }
    }

    info!(
        "Executing project template: {} {} {:?}",
        template.command, template.name, args
    );

    let output = tokio::process::Command::new(&template.command)
        .args(&args)
        .current_dir(&base_path)
        .output()
        .await
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        error!("Project creation failed: {}", stderr);
        return Err(format!("Project creation failed: {}", stderr));
    }

    let state_file = ProjectStateFile::new(&template.project_type);
    let state_path = project_path.join("project_state.json");

    if let Ok(content) = serde_json::to_string_pretty(&state_file) {
        if let Err(e) = tokio::fs::write(&state_path, content).await {
            error!("Failed to write project_state.json: {}", e);
        } else {
            info!("Created project_state.json at {:?}", state_path);
        }
    }

    let db_guard = db.lock().await;
    if let Some(service) = db_guard.as_ref() {
        let task_id = format!("project-{}-{}", safe_name, Utc::now().timestamp());
        if let Err(e) = service.log_task(&task_id, &format!("Create project: {}", safe_name), "completed")
        {
            debug!("Failed to log project creation to DB: {}", e);
        }
        if let Err(e) = service.log_activity(
            "project_created",
            &format!(
                "Created {} project '{}' using template '{}'",
                template.project_type, safe_name, template.name
            ),
        ) {
            debug!("Failed to log activity to DB: {}", e);
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "project_name": safe_name,
        "template": template.name,
        "path": project_path.to_string_lossy().to_string(),
        "stdout": stdout,
        "stderr": stderr,
    }))
}

fn detect_project_type(dir: &Path) -> String {
    if dir.join("src-tauri").exists() {
        return "tauri".to_string();
    }
    if dir.join("electron").exists() || dir.join("electron.vite.config.ts").exists() {
        return "electron".to_string();
    }
    if dir.join("capacitor.config.ts").exists() || dir.join("android").exists() || dir.join("ios").exists()
    {
        return "capacitor".to_string();
    }
    if dir.join("requirements.txt").exists() || dir.join("pyproject.toml").exists() {
        return "python".to_string();
    }
    "web".to_string()
}

#[tauri::command]
pub async fn list_projects(
    config: State<'_, Config>,
) -> Result<Vec<ProjectInfo>, String> {
    list_projects_in_root(&config.workspace_root)
}

pub fn list_projects_in_root(workspace_root: &str) -> Result<Vec<ProjectInfo>, String> {
    let apps_dir = path_policy::validate_directory_path(workspace_root)?;

    let entries = std::fs::read_dir(&apps_dir)
        .map_err(|e| format!("Failed to read workspace directory: {}", e))?;

    let mut projects = Vec::new();

    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if !path.join("package.json").exists() && !path.join("project.json").exists() {
            continue;
        }

        let dir_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let name = if path.join("package.json").exists() {
            std::fs::read_to_string(path.join("package.json"))
                .ok()
                .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
                .and_then(|pkg| pkg.get("name").and_then(|n| n.as_str()).map(String::from))
                .unwrap_or_else(|| dir_name.clone())
        } else {
            dir_name.clone()
        };

        let has_state = path.join("project_state.json").exists();
        let project_type = detect_project_type(&path);

        projects.push(ProjectInfo {
            id: dir_name,
            name,
            path: path.to_string_lossy().to_string(),
            project_type,
            has_state,
        });
    }

    projects.sort_by(|a, b| a.name.cmp(&b.name));
    info!("Listed {} projects from workspace", projects.len());

    Ok(projects)
}
