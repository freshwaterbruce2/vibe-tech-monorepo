use crate::database::checkpoints::{digest_value, CheckpointContent};
use crate::database::{types::Task, DatabaseService};
use crate::modules::state::Config;
use crate::modules::{llm, procedural_memory, prompts};
use crate::task_executor_support::{
    append_checkpoint_item, execution_prompt, review_gate_error, TaskExecutionMetadata,
};
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

const MAX_EXECUTION_DURATION_MINUTES: u64 = 240;

/// Task Executor - Autonomous task processing engine
/// Monitors the task queue and executes tasks using LLM + tools
pub struct TaskExecutor {
    db: Arc<AsyncMutex<Option<DatabaseService>>>,
    config: Arc<Config>,
    is_running: Arc<AsyncMutex<bool>>,
}

impl TaskExecutor {
    pub fn new(db: Arc<AsyncMutex<Option<DatabaseService>>>, config: Arc<Config>) -> Self {
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
        let _ = service.retry_pending_continuation_cleanup();

        // Get pending tasks (status = "pending" or "ready")
        let tasks = service
            .get_tasks(Some("pending"), Some(5))
            .map_err(|e| format!("Failed to fetch tasks: {}", e))?;

        if tasks.is_empty() {
            // Also check for "ready" status
            let ready_tasks = service
                .get_tasks(Some("ready"), Some(5))
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
        let risk = metadata
            .risk
            .clone()
            .unwrap_or_else(|| "medium".to_string());
        let auto_execute = metadata.auto_execute.unwrap_or(false);
        let requires_approval = metadata.requires_approval.unwrap_or(false);
        let approved_for_execution = metadata.approved_for_execution.unwrap_or(false);
        let max_duration_minutes = metadata
            .max_duration_minutes
            .unwrap_or(15)
            .min(MAX_EXECUTION_DURATION_MINUTES)
            .max(1);

        let (workspace_fingerprint, preconditions) = {
            let db_guard = db.lock().await;
            let service = db_guard.as_ref().ok_or("Database not available")?;
            service.trusted_resume_evidence(&task.id)?
        };
        let plan = json!({
            "steps":["validate_review","execute_with_tools","verify_outcome"],
            "task_definition_digest": preconditions.get("task_definition_digest"),
        });
        let action_fingerprint = digest_value(&json!({
            "kind": "task_execution",
            "plan": plan,
            "workspace": workspace_fingerprint,
            "evidence": preconditions,
        }));

        let mut checkpoint = {
            let db_guard = db.lock().await;
            let service = db_guard.as_ref().ok_or("Database not available")?;
            match service
                .get_checkpoint(&task.id)
                .map_err(|e| e.to_string())?
            {
                Some(existing)
                    if existing.content.workspace_fingerprint == workspace_fingerprint
                        && existing.content.preconditions == preconditions =>
                {
                    existing
                }
                Some(_) => return Err("CURRENT_WORKSPACE_REVIEW_REQUIRED".to_string()),
                None => service.save_checkpoint(
                    &task.id,
                    0,
                    &CheckpointContent {
                        state: "planned".to_string(),
                        plan: plan.clone(),
                        progress: json!({"completed":[]}),
                        tool_results: json!([]),
                        pending_approval: None,
                        errors: json!([]),
                        conversation: json!([]),
                        next_action: json!({"kind":"validate_review"}),
                        workspace_fingerprint: workspace_fingerprint.clone(),
                        preconditions: preconditions.clone(),
                    },
                )?,
            }
        };
        let approval_digest = {
            let db_guard = db.lock().await;
            let service = db_guard.as_ref().ok_or("Database not available")?;
            service.effect_approval_digest(
                &task.id,
                &checkpoint.content.plan,
                &action_fingerprint,
            )?
        };
        let approval_is_current =
            metadata.approved_plan_digest.as_deref() == Some(&approval_digest);

        if (requires_approval || auto_execute) && (!approved_for_execution || !approval_is_current)
        {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                if checkpoint.content.pending_approval.is_none() {
                    checkpoint.content.state = "awaiting_approval".to_string();
                    checkpoint.content.pending_approval = Some(json!({
                        "checkpoint_revision": checkpoint.revision + 1,
                        "action_fingerprint": action_fingerprint.clone(),
                        "approval_digest": approval_digest,
                        "action_kind": "task_execution",
                    }));
                    checkpoint.content.next_action = json!({"kind":"await_approval"});
                    checkpoint = service.save_checkpoint(
                        &task.id,
                        checkpoint.revision,
                        &checkpoint.content,
                    )?;
                }
                service
                    .update_task_status(&task.id, "awaiting_approval")
                    .map_err(|e| e.to_string())?;
            }
            info!("Task {} is awaiting checkpoint-bound approval", task.id);
            return Ok(());
        }

        if !auto_execute {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.update_task_status(&task.id, "queued");
                checkpoint.content.state = "paused".to_string();
                checkpoint.content.next_action = json!({"kind":"manual_start"});
                let _ = service.save_checkpoint(&task.id, checkpoint.revision, &checkpoint.content);
            }
            debug!("Skipping task {} because auto_execute is disabled", task.id);
            return Ok(());
        }

        if let Some(reason) = review_gate_error(&task.id, &metadata, &project_path) {
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.update_task_status(&task.id, "blocked_review");
                checkpoint.content.state = "needs_review".to_string();
                checkpoint.content.errors = json!([{"stage":"review_gate","summary":&reason}]);
                checkpoint.content.next_action = json!({"kind":"review_required"});
                let _ = service.save_checkpoint(&task.id, checkpoint.revision, &checkpoint.content);
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
                checkpoint.content.state = "running".to_string();
                checkpoint.content.progress = json!({"completed":["validate_review"]});
                checkpoint.content.next_action = json!({"kind":"execute_with_tools"});
                checkpoint =
                    service.save_checkpoint(&task.id, checkpoint.revision, &checkpoint.content)?;
                service
                    .update_task_status(&task.id, "in_progress")
                    .map_err(|e| format!("Failed to update task status: {}", e))?;
            }
        }

        // Recall similar past procedural patterns to inject as hints.
        // Best-effort — never blocks the task on lookup failures.
        let recall_patterns = procedural_memory::recall_for_task(
            db,
            &task.title,
            &description,
            procedural_memory::DEFAULT_RECALL_LIMIT,
        )
        .await;
        let procedural_hints = procedural_memory::format_recall_for_prompt(&recall_patterns);

        // Build execution prompt
        let execution_prompt = execution_prompt(
            &task,
            &description,
            &project_path,
            &risk,
            max_duration_minutes,
            &metadata,
        );
        let execution_prompt = if procedural_hints.is_empty() {
            execution_prompt
        } else {
            format!("{}{}", execution_prompt, procedural_hints)
        };

        // Load system prompt for task execution
        let system_prompt = prompts::require_system_prompt("nova-core-v1");

        // Execute task using LLM with tool calling
        let task_model =
            std::env::var("NOVA_DEFAULT_MODEL").unwrap_or_else(|_| "kimi-k2.5".to_string());

        match tokio::time::timeout(
            Duration::from_secs(max_duration_minutes * 60),
            llm::dispatch_model_request(
                &execution_prompt,
                vec![],
                &system_prompt,
                &task_model,
                config,
                db,
                Some(&task.id),
            ),
        )
        .await
        {
            Ok(Ok(result)) => {
                info!("✅ Task completed successfully: {}", task.id);

                // Update status to completed
                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    checkpoint = service
                        .get_checkpoint(&task.id)
                        .map_err(|error| error.to_string())?
                        .ok_or_else(|| "Task checkpoint is missing".to_string())?;
                    checkpoint.content.state = "completed".to_string();
                    checkpoint.content.progress = json!({"completed":["validate_review","execute_with_tools","verify_outcome"]});
                    append_checkpoint_item(
                        &mut checkpoint.content.tool_results,
                        json!({"kind":"summary","outcome":"success","result_bytes":result.len()}),
                    );
                    checkpoint.content.next_action = json!({"kind":"none"});
                    service.transition_task_outcome(
                        &task.id,
                        checkpoint.revision,
                        "completed",
                        &checkpoint.content,
                    )?;
                    let _ = service.retry_pending_continuation_cleanup();

                    // Log completion to activity
                    let _ = service.log_activity(
                        "Task Completed",
                        &format!("Task '{}' completed successfully", task.title),
                    );

                    // Log to learning system for pattern analysis
                    let _ = service.log_learning_event(
                        "autonomous_task_success",
                        &format!("Task: {} | Project: {}", task.title, project_path),
                        &format!(
                            "Task completed successfully. Result length: {} chars",
                            result.len()
                        ),
                    );
                }
                drop(db_guard);
                procedural_memory::record_task_outcome(
                    db,
                    &task.title,
                    &description,
                    &project_path,
                    true,
                    Some(&task_model),
                )
                .await;
                Ok(())
            }
            Ok(Err(e)) => {
                if e == "TOOL_APPROVAL_REQUIRED" {
                    info!("Task {} paused for explicit tool approval", task.id);
                    return Ok(());
                }
                error!("❌ Task failed: {} - Error: {}", task.id, e);

                // Update status to failed
                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    checkpoint = service
                        .get_checkpoint(&task.id)
                        .map_err(|error| error.to_string())?
                        .ok_or_else(|| "Task checkpoint is missing".to_string())?;
                    checkpoint.content.state = "needs_review".to_string();
                    append_checkpoint_item(
                        &mut checkpoint.content.errors,
                        json!({"stage":"execution","summary":e.to_string()}),
                    );
                    if checkpoint.content.next_action.get("secure_ref").is_none() {
                        checkpoint.content.next_action = json!({"kind":"review_partial_failure"});
                    }
                    service.transition_task_outcome(
                        &task.id,
                        checkpoint.revision,
                        "needs_review",
                        &checkpoint.content,
                    )?;

                    // Log failure to activity
                    let _ = service.log_activity(
                        "Task Failed",
                        &format!("Task '{}' failed: {}", task.title, e),
                    );

                    // Log to learning system for failure analysis
                    let _ = service.log_learning_event(
                        "autonomous_task_failure",
                        &format!("Task: {} | Project: {}", task.title, project_path),
                        &format!("Task failed with error: {}", e),
                    );
                }
                drop(db_guard);
                procedural_memory::record_task_outcome(
                    db,
                    &task.title,
                    &description,
                    &project_path,
                    false,
                    Some(&task_model),
                )
                .await;
                Err(format!("Task execution failed: {}", e))
            }
            Err(_) => {
                error!("❌ Task timed out: {}", task.id);

                let db_guard = db.lock().await;
                if let Some(service) = db_guard.as_ref() {
                    checkpoint = service
                        .get_checkpoint(&task.id)
                        .map_err(|error| error.to_string())?
                        .ok_or_else(|| "Task checkpoint is missing".to_string())?;
                    checkpoint.content.state = "needs_review".to_string();
                    append_checkpoint_item(
                        &mut checkpoint.content.errors,
                        json!({"stage":"execution","summary":"execution timed out"}),
                    );
                    if checkpoint.content.next_action.get("secure_ref").is_none() {
                        checkpoint.content.next_action = json!({"kind":"review_partial_failure"});
                    }
                    service.transition_task_outcome(
                        &task.id,
                        checkpoint.revision,
                        "needs_review",
                        &checkpoint.content,
                    )?;
                    let _ = service.log_activity(
                        "Task Timed Out",
                        &format!(
                            "Task '{}' exceeded {} minutes",
                            task.title, max_duration_minutes
                        ),
                    );
                }
                drop(db_guard);
                procedural_memory::record_task_outcome(
                    db,
                    &task.title,
                    &description,
                    &project_path,
                    false,
                    Some(&task_model),
                )
                .await;
                Err(format!(
                    "Task execution exceeded {} minutes",
                    max_duration_minutes
                ))
            }
        }
    }
}
