use crate::database;
use crate::modules::state::Config;
use crate::modules::agents::WORKTREE_PATH;
use crate::modules::prompts;
use crate::modules::llm;
use crate::modules::git_worktree;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{State, Emitter};
use tokio::sync::Mutex as AsyncMutex;
use tracing::{info, error};
use uuid::Uuid;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub description: String,
    pub assigned_agent: String,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDag {
    pub subtasks: Vec<Subtask>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtaskStatus {
    pub id: String,
    pub title: String,
    pub description: String,
    pub assigned_agent: String,
    pub dependencies: Vec<String>,
    pub status: String, // "pending", "running", "completed", "failed"
    pub log: String,
    pub worktree_path: Option<String>,
    pub branch_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultitaskStatus {
    pub task_id: String,
    pub prompt: String,
    pub subtasks: Vec<SubtaskStatus>,
    pub overall_status: String, // "running", "completed", "failed"
}

// Global list of active multitasks (protected by a mutex)
use std::sync::OnceLock;
pub static ACTIVE_MULTITASKS: OnceLock<AsyncMutex<HashMap<String, MultitaskStatus>>> = OnceLock::new();

fn get_active_multitasks() -> &'static AsyncMutex<HashMap<String, MultitaskStatus>> {
    ACTIVE_MULTITASKS.get_or_init(|| AsyncMutex::new(HashMap::new()))
}

async fn run_multitask_orchestrator(
    task_id: String,
    config: Arc<Config>,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
    handle: tauri::AppHandle,
) {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(100);

    loop {
        // 1. Lock and inspect DAG to see if we can spawn any pending subtasks
        let mut tasks_to_spawn = Vec::new();
        {
            let mut active_guard = get_active_multitasks().lock().await;
            if let Some(task) = active_guard.get_mut(&task_id) {
                let completed_ids: std::collections::HashSet<String> = task.subtasks.iter()
                    .filter(|s| s.status == "completed")
                    .map(|s| s.id.clone())
                    .collect();

                let mut to_start = Vec::new();
                for sub in &task.subtasks {
                    if sub.status == "pending" {
                        let deps_met = sub.dependencies.iter().all(|dep_id| {
                            completed_ids.contains(dep_id)
                        });
                        if deps_met {
                            to_start.push(sub.id.clone());
                        }
                    }
                }

                for sub in &mut task.subtasks {
                    if to_start.contains(&sub.id) {
                        sub.status = "running".to_string();
                        sub.log.push_str("Starting subtask execution...\n");
                        tasks_to_spawn.push(sub.clone());
                    }
                }

                // Emit current status before running new ones
                let _ = handle.emit("multitask-status", task.clone());

                // Check if all subtasks are finished
                let all_finished = task.subtasks.iter().all(|s| s.status == "completed" || s.status == "failed");
                let any_failed = task.subtasks.iter().any(|s| s.status == "failed");
                if all_finished {
                    task.overall_status = if any_failed { "failed".to_string() } else { "completed".to_string() };
                    let _ = handle.emit("multitask-status", task.clone());
                    info!("Multitask {} finished execution: {}", task_id, task.overall_status);
                    break;
                }
            } else {
                break; // Task was removed or canceled
            }
        }

        // 2. Spawn the ready subtasks concurrently
        for sub in tasks_to_spawn {
            let tx_clone = tx.clone();
            let config_clone = config.clone();
            let db_clone = db.clone();
            let handle_clone = handle.clone();
            let task_id_clone = task_id.clone();

            tokio::spawn(async move {
                let sub_id = sub.id.clone();
                let sub_title = sub.title.clone();
                info!("Spawning worker for subtask {} ('{}')", sub_id, sub_title);

                // Run subtask
                let run_result = run_single_subtask(&task_id_clone, &sub, config_clone, db_clone, handle_clone.clone()).await;

                // Update subtask status in global map
                {
                    let mut active_guard = get_active_multitasks().lock().await;
                    if let Some(task) = active_guard.get_mut(&task_id_clone) {
                        if let Some(s) = task.subtasks.iter_mut().find(|x| x.id == sub_id) {
                            match run_result {
                                Ok((worktree_path, branch_name)) => {
                                    s.status = "completed".to_string();
                                    s.worktree_path = Some(worktree_path.to_string_lossy().to_string());
                                    s.branch_name = Some(branch_name);
                                    s.log.push_str("\nSubtask completed successfully. Git worktree branch created and committed.\n");
                                }
                                Err(e) => {
                                    s.status = "failed".to_string();
                                    s.log.push_str(&format!("\nSubtask failed: {}\n", e));
                                    error!("Subtask {} failed: {}", sub_id, e);
                                }
                            }
                        }
                        // Emit updated status
                        let _ = handle_clone.emit("multitask-status", task.clone());
                    }
                }

                let _ = tx_clone.send(sub_id).await;
            });
        }

        // 3. Wait for a subtask completion event
        if rx.recv().await.is_none() {
            break;
        }
    }
}

async fn run_single_subtask(
    _task_id: &str,
    sub: &SubtaskStatus,
    config: Arc<Config>,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
    _handle: tauri::AppHandle,
) -> Result<(PathBuf, String), String> {
    // 1. Create git worktree
    let repo_path = Path::new(&config.workspace_root);
    let (worktree_path, branch_name) = git_worktree::create_worktree(repo_path, &sub.id)?;

    // 2. Set up subagent context in task local scope
    let wt_path_inside = worktree_path.clone();
    let result = WORKTREE_PATH.scope(worktree_path.clone(), {
        let title = sub.title.clone();
        let description = sub.description.clone();
        let agent = sub.assigned_agent.clone();
        let config_clone = config.clone();
        let db_clone = db.clone();

        async move {
            info!("Running subagent '{}' inside worktree '{}'", agent, wt_path_inside.display());

            // Determine prompt based on specialized agent schema
            let system_prompt = match agent.as_str() {
                "coder" => prompts::require_system_prompt("nova-engineer-v1"),
                "architect" => prompts::require_system_prompt("nova-architect-v1"),
                _ => prompts::require_system_prompt("nova-core-v1"),
            };

            let execution_prompt = format!(
                "You are the specialized agent '{}'. Complete the following subtask.
Subtask Title: {}
Subtask Description: {}

You must execute changes by writing code or reading files using your tools. Since you are running in an isolated worktree environment, all files will be automatically checked out at your worktree path. You can treat paths normally (e.g. C:\\dev\\src\\main.rs) and the system will automatically isolate them.
Begin working on this subtask now.",
                agent, title, description
            );

            let model = std::env::var("NOVA_DEFAULT_MODEL").unwrap_or_else(|_| "kimi-k2.5".to_string());

            llm::dispatch_model_request(
                &execution_prompt,
                vec![],
                &system_prompt,
                &model,
                &config_clone,
                &db_clone,
            )
            .await
        }
    })
    .await;

    match result {
        Ok(res) => {
            info!("Subtask '{}' succeeded. Result: {}", sub.title, res);
            // Commit changes in worktree
            let commit_msg = format!("Completed subtask '{}' ({})", sub.title, sub.id);
            let _ = git_worktree::commit_worktree_changes(&worktree_path, &commit_msg);
            Ok((worktree_path, branch_name))
        }
        Err(e) => {
            error!("Subtask '{}' execution failed: {}", sub.title, e);
            // Clean up worktree on failure
            let _ = git_worktree::remove_worktree(repo_path, &worktree_path, &branch_name);
            Err(e)
        }
    }
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_multitask(
    prompt: String,
    config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
    handle: tauri::AppHandle,
) -> Result<String, String> {
    info!("Starting multitask decomposition for prompt: {}", prompt);

    // Break prompt into DAG using LLM
    let decomposer_system_prompt = r#"You are the Swarm Architect. Break down the user's request into a Directed Acyclic Graph (DAG) of independent subtasks.
Each subtask must be assigned to one of:
- "coder": for code writing, refactoring, debugging, test generation.
- "architect": for planning, high-level design, database design, schema design.
- "nova": for general queries, documentation, integration.

Output JSON only, matching the schema:
{
  "subtasks": [
    {
      "id": "task_id_1",
      "title": "Short title",
      "description": "Detailed description of what this subagent must do",
      "assigned_agent": "coder" | "architect" | "nova",
      "dependencies": []
    }
  ]
}

Ensure:
1. There are no circular dependencies.
2. Independent tasks run in parallel.
3. Every task has a unique ID."#;

    let model = std::env::var("NOVA_DEFAULT_MODEL").unwrap_or_else(|_| "kimi-k2.5".to_string());
    let decomp_res = llm::dispatch_model_request(
        &prompt,
        vec![],
        decomposer_system_prompt,
        &model,
        &config,
        &db,
    )
    .await?;

    let json_str = if let Some(start) = decomp_res.find("```json") {
        let rest = &decomp_res[start + 7..];
        if let Some(end) = rest.find("```") {
            &rest[..end]
        } else {
            rest
        }
    } else if let Some(start) = decomp_res.find('{') {
        &decomp_res[start..]
    } else {
        &decomp_res
    };

    let dag: TaskDag = serde_json::from_str(json_str.trim())
        .map_err(|e| format!("Failed to parse DAG JSON: {}. LLM output: {}", e, decomp_res))?;

    let task_id = Uuid::new_v4().to_string();

    let subtask_statuses = dag.subtasks.iter().map(|sub| SubtaskStatus {
        id: sub.id.clone(),
        title: sub.title.clone(),
        description: sub.description.clone(),
        assigned_agent: sub.assigned_agent.clone(),
        dependencies: sub.dependencies.clone(),
        status: "pending".to_string(),
        log: String::new(),
        worktree_path: None,
        branch_name: None,
    }).collect();

    let status = MultitaskStatus {
        task_id: task_id.clone(),
        prompt: prompt.clone(),
        subtasks: subtask_statuses,
        overall_status: "running".to_string(),
    };

    // Store task in global state
    {
        let mut active_guard = get_active_multitasks().lock().await;
        active_guard.insert(task_id.clone(), status.clone());
    }

    // Spawn the background orchestrator loop
    let config_arc = Arc::new(config.inner().clone());
    let db_arc = db.inner().clone();
    let handle_clone = handle.clone();
    let task_id_clone = task_id.clone();
    tokio::spawn(async move {
        run_multitask_orchestrator(task_id_clone, config_arc, db_arc, handle_clone).await;
    });

    Ok(task_id)
}

#[tauri::command]
pub async fn get_multitask_status(task_id: String) -> Result<Option<MultitaskStatus>, String> {
    let active_guard = get_active_multitasks().lock().await;
    Ok(active_guard.get(&task_id).cloned())
}

#[tauri::command]
pub async fn list_active_multitasks() -> Result<Vec<MultitaskStatus>, String> {
    let active_guard = get_active_multitasks().lock().await;
    Ok(active_guard.values().cloned().collect())
}

#[tauri::command]
pub async fn approve_and_merge_worktree(
    branch_name: String,
    worktree_path: String,
    config: State<'_, Config>,
) -> Result<(), String> {
    let repo_path = Path::new(&config.workspace_root);
    let wt_path = Path::new(&worktree_path);

    // Merge changes
    git_worktree::merge_worktree_branch(repo_path, &branch_name)?;

    // Clean up worktree
    git_worktree::remove_worktree(repo_path, wt_path, &branch_name)?;

    Ok(())
}

#[tauri::command]
pub async fn reject_worktree(
    branch_name: String,
    worktree_path: String,
    config: State<'_, Config>,
) -> Result<(), String> {
    let repo_path = Path::new(&config.workspace_root);
    let wt_path = Path::new(&worktree_path);

    // Clean up worktree without merging
    git_worktree::remove_worktree(repo_path, wt_path, &branch_name)?;

    Ok(())
}

#[tauri::command]
pub async fn get_worktree_diff(
    branch_name: String,
    config: State<'_, Config>,
) -> Result<String, String> {
    let repo_path = Path::new(&config.workspace_root);
    let output = Command::new("git")
        .current_dir(repo_path)
        .arg("diff")
        .arg(format!("HEAD..{}", branch_name))
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let diff = String::from_utf8_lossy(&output.stdout).into_owned();
    Ok(diff)
}
