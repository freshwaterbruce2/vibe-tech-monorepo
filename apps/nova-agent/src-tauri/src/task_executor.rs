use crate::database::{DatabaseService, types::Task};
use crate::modules::{llm, prompts};
use crate::modules::state::Config;
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;
use tokio::time::sleep;
use tracing::{info, warn, error, debug};

const MAX_EXECUTION_DURATION_MINUTES: u64 = 240;

#[derive(Debug, Default, Deserialize)]
struct TaskExecutionMetadata {
    description: Option<String>,
    project_path: Option<String>,
    auto_execute: Option<bool>,
    risk: Option<String>,
    max_duration_minutes: Option<u64>,
    requires_approval: Option<bool>,
    approved_for_execution: Option<bool>,
    review_artifact_path: Option<String>,
    review_completed: Option<bool>,
    review_target_path: Option<String>,
    review_evidence_count: Option<u64>,
    reviewed_at: Option<String>,
    review_version: Option<String>,
    plan_grounded: Option<bool>,
    generic_plan_flags: Option<Vec<String>>,
}

impl TaskExecutionMetadata {
    fn from_task(task: &Task) -> Self {
        task.metadata
            .as_deref()
            .and_then(|raw| serde_json::from_str::<TaskExecutionMetadata>(raw).ok())
            .unwrap_or_default()
    }
}

/// Task Executor - Autonomous task processing engine
/// Monitors the task queue and executes tasks using LLM + tools
pub struct TaskExecutor {
    db: Arc<AsyncMutex<Option<DatabaseService>>>,
    config: Arc<Config>,
    is_running: Arc<AsyncMutex<bool>>,
}

impl TaskExecutor {
    pub fn new(
        db: Arc<AsyncMutex<Option<DatabaseService>>>,
        config: Arc<Config>,
    ) -> Self {
        Self {
            db,
            config,
            is_running: Arc::new(AsyncMutex::new(false)),
        }
    }

    /// Start the task executor background service
    pub async fn start(&self) {
        let mut running = self.is_running.lock().await;
        if *running {
            warn!("Task executor already running");
            return;
        }
        *running = true;
        drop(running);

        info!("🚀 Task Executor started - monitoring queue for tasks");

        // Clone Arcs for the background task
        let db = self.db.clone();
        let config = self.config.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            loop {
                // Check if we should stop
                {
                    let running = is_running.lock().await;
                    if !*running {
                        info!("Task executor stopped");
                        break;
                    }
                }

                // Poll for pending tasks
                if let Err(e) = Self::poll_and_execute_tasks(&db, &config).await {
                    error!("Error in task execution loop: {}", e);
                }

                // Wait before next poll (10 seconds)
                sleep(Duration::from_secs(10)).await;
            }
        });
    }

    /// Stop the task executor
    #[allow(dead_code)] // Reserved for graceful shutdown
    pub async fn stop(&self) {
        let mut running = self.is_running.lock().await;
        *running = false;
        info!("Task executor stopping...");
    }

    /// Poll database for pending tasks and execute them
    async fn poll_and_execute_tasks(
        db: &Arc<AsyncMutex<Option<DatabaseService>>>,
        config: &Arc<Config>,
    ) -> Result<(), String> {
        let db_guard = db.lock().await;
        let service = db_guard.as_ref().ok_or("Database not available")?;

        // Get pending tasks (status = "pending" or "ready")
        let tasks = service.get_tasks(Some("pending"), Some(5))
            .map_err(|e| format!("Failed to fetch tasks: {}", e))?;

        if tasks.is_empty() {
            // Also check for "ready" status
            let ready_tasks = service.get_tasks(Some("ready"), Some(5))
                .map_err(|e| format!("Failed to fetch ready tasks: {}", e))?;

            if ready_tasks.is_empty() {
                debug!("No pending tasks in queue");
                return Ok(());
            }

            // Process ready tasks
            drop(db_guard);
            for task in ready_tasks {
                Self::execute_task(task, db, config).await?;
            }
            return Ok(());
        }

        drop(db_guard);

        // Execute each pending task
        for task in tasks {
            Self::execute_task(task, db, config).await?;
        }

        Ok(())
    }

    /// Execute a single task using LLM with tools
    async fn execute_task(
        task: Task,
        db: &Arc<AsyncMutex<Option<DatabaseService>>>,
        config: &Arc<Config>,
    ) -> Result<(), String> {
        info!("🎯 Executing task: {} (ID: {})", task.title, task.id);

        let metadata = TaskExecutionMetadata::from_task(&task);
        let project_path = metadata
            .project_path
            .clone()
            .unwrap_or_else(|| "Unknown".to_string());
        let description = metadata
            .description
            .clone()
            .unwrap_or_else(|| "No description provided".to_string());
        let risk = metadata.risk.clone().unwrap_or_else(|| "medium".to_string());
        let auto_execute = metadata.auto_execute.unwrap_or(false);
        let requires_approval = metadata.requires_approval.unwrap_or(false);
        let approved_for_execution = metadata.approved_for_execution.unwrap_or(false);
        let max_duration_minutes = metadata
            .max_duration_minutes
            .unwrap_or(15)
            .min(MAX_EXECUTION_DURATION_MINUTES)
            .max(1);

        if requires_approval && !approved_for_execution {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.update_task_status(&task.id, "awaiting_approval");
            }
            info!("Task {} moved to awaiting_approval", task.id);
            return Ok(());
        }

        if !auto_execute {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.update_task_status(&task.id, "queued");
            }
            debug!("Skipping task {} because auto_execute is disabled", task.id);
            return Ok(());
        }

        let review_completed = metadata.review_completed.unwrap_or(false);
        let plan_grounded = metadata.plan_grounded.unwrap_or(false);
        let generic_plan_flags = metadata.generic_plan_flags.clone().unwrap_or_default();
        let review_target_path = metadata.review_target_path.clone().unwrap_or_default();
        let review_artifact_path = metadata.review_artifact_path.clone();
        let review_evidence_count = metadata.review_evidence_count.unwrap_or(0);
        let reviewed_at = metadata.reviewed_at.clone().unwrap_or_else(|| "unknown".to_string());
        let review_version = metadata.review_version.clone().unwrap_or_else(|| "unknown".to_string());

        let review_gate_error = if !review_completed {
            Some(format!(
                "Task {} is blocked: no grounded project review is attached. Run `nova analyze --path {}` first.",
                task.id, project_path
            ))
        } else if !plan_grounded {
            Some(format!(
                "Task {} is blocked: the plan was marked ungrounded. Flags: {}",
                task.id,
                if generic_plan_flags.is_empty() {
                    "none supplied".to_string()
                } else {
                    generic_plan_flags.join(" | ")
                }
            ))
        } else if !generic_plan_flags.is_empty() {
            Some(format!(
                "Task {} is blocked: generic plan flags were detected: {}",
                task.id,
                generic_plan_flags.join(" | ")
            ))
        } else {
            match crate::modules::project_review::validate_review_for_project(
                &project_path,
                review_artifact_path.as_deref(),
            ) {
                Ok(review) => {
                    if !review_target_path.is_empty()
                        && review.reviewed_path.to_lowercase() != review_target_path.to_lowercase()
                    {
                        Some(format!(
                            "Task {} is blocked: review target mismatch. Metadata points to {}, artifact points to {}.",
                            task.id, review_target_path, review.reviewed_path
                        ))
                    } else if review_evidence_count > 0 && review.evidence_count < review_evidence_count as usize {
                        Some(format!(
                            "Task {} is blocked: review evidence count regressed from {} to {}.",
                            task.id, review_evidence_count, review.evidence_count
                        ))
                    } else {
                        None
                    }
                }
                Err(e) => Some(format!("Task {} is blocked: {}", task.id, e)),
            }
        };

        if let Some(reason) = review_gate_error {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.update_task_status(&task.id, "blocked_review");
                let _ = service.log_activity("Task Blocked", &reason);
                let _ = service.log_learning_event(
                    "autonomous_task_blocked_review",
                    &format!("Task: {} | Project: {}", task.title, project_path),
                    &reason,
                );
            }
            warn!("{}", reason);
            return Ok(());
        }

        // Update status to in_progress
        {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                service.update_task_status(&task.id, "in_progress")
                    .map_err(|e| format!("Failed to update task status: {}", e))?;
            }
        }

        // Build execution prompt
        let execution_prompt = format!(
            "You have been assigned a task to complete autonomously.

\
             TASK DETAILS:
\
             - Title: {}
\
             - Description: {}
\
             - Project Path: {}
\
             - Risk: {}
\
             - Max Duration Minutes: {}
\
             - Review Completed: {}
\
             - Review Version: {}
\
             - Review Timestamp: {}
\
             - Review Evidence Count: {}

\
             EXECUTION CONSTRAINTS:
\
             1. Stay within the reviewed project path.
\
             2. Base changes on the grounded review context and the files you verify during execution.
\
             3. Do not invent files, dashboards, or deliverables as if they already exist.
\
             4. If the reviewed evidence and current files disagree, stop and report the mismatch.
\
             5. Verify your changes before claiming completion.

\
             Available tools: read_file, write_file, list_directory, execute_code, internet_search

\
             Begin working on this task now. Be thorough and methodical.",
            task.title,
            description,
            project_path,
            risk,
            max_duration_minutes,
            review_completed,
            review_version,
            reviewed_at,
            review_evidence_count,
        );

        // Load system prompt for task execution
        let system_prompt = prompts::require_system_prompt("nova-core-v1");

        // Execute task using LLM with tool calling
        let task_model = std::env::var("NOVA_DEFAULT_MODEL")
            .unwrap_or_else(|_| "kimi-k2.5".to_string());

        match tokio::time::timeout(
            Duration::from_secs(max_duration_minutes * 60),
            llm::dispatch_model_request(
                &execution_prompt,
                vec![],
                &system_prompt,
                &task_model,
                config,
                db,
            ),
        )
        .await
        {
            Ok(Ok(result)) => {
                info!("✅ Task completed successfully: {}", task.id);
                info!("Result: {}", result);

                // Update status to completed
                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    service.update_task_status(&task.id, "completed")
                        .map_err(|e| format!("Failed to update task status: {}", e))?;

                    // Log completion to activity
                    let _ = service.log_activity(
                        "Task Completed",
                        &format!("Task '{}' completed successfully", task.title)
                    );

                    // Log to learning system for pattern analysis
                    let _ = service.log_learning_event(
                        "autonomous_task_success",
                        &format!("Task: {} | Project: {}", task.title, project_path),
                        &format!("Task completed successfully. Result length: {} chars", result.len())
                    );
                }
                Ok(())
            },
            Ok(Err(e)) => {
                error!("❌ Task failed: {} - Error: {}", task.id, e);

                // Update status to failed
                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    service.update_task_status(&task.id, "failed")
                        .map_err(|e| format!("Failed to update task status: {}", e))?;

                    // Log failure to activity
                    let _ = service.log_activity(
                        "Task Failed",
                        &format!("Task '{}' failed: {}", task.title, e)
                    );

                    // Log to learning system for failure analysis
                    let _ = service.log_learning_event(
                        "autonomous_task_failure",
                        &format!("Task: {} | Project: {}", task.title, project_path),
                        &format!("Task failed with error: {}", e)
                    );
                }
                Err(format!("Task execution failed: {}", e))
            }
            Err(_) => {
                error!("❌ Task timed out: {}", task.id);

                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    service.update_task_status(&task.id, "timed_out")
                        .map_err(|e| format!("Failed to update task status: {}", e))?;
                    let _ = service.log_activity(
                        "Task Timed Out",
                        &format!("Task '{}' exceeded {} minutes", task.title, max_duration_minutes)
                    );
                }
                Err(format!("Task execution exceeded {} minutes", max_duration_minutes))
            }
        }
    }
}
