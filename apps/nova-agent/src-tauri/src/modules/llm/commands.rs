use crate::database;
use crate::modules::agents::AgentRegistry;
use crate::modules::prompts;
use crate::modules::state::{AppState, ChatMessage, Config};
use crate::modules::system_prompt;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{debug, info};

use super::provider::dispatch_model_request;
use super::validation::MAX_HISTORY_MESSAGES;
#[tauri::command]
pub async fn chat_with_agent(
    message: String,
    _project_id: Option<String>,
    state: State<'_, AppState>,
    config: State<'_, Config>,
    db: State<'_, Arc<AsyncMutex<Option<database::DatabaseService>>>>,
) -> Result<String, String> {
    debug!("Received chat message: {}", message);

    let mut agent_state = state.lock().await;

    // Get active model, defaulting to Kimi k2.5 if empty
    let active_model = if agent_state.active_model.trim().is_empty() {
        "kimi-k2.5".to_string()
    } else {
        agent_state.active_model.clone()
    };

    // Update state to reflect what we are using (if it was empty)
    agent_state.active_model = active_model.clone();

    // Load 7-Layer System Prompt from file (with database/fallback)
    let system_prompt_content = system_prompt::load_system_prompt();

    // Use loaded prompt, or fallback to agent registry if file load fails
    let system_prompt = if system_prompt_content.len() > 100 {
        system_prompt_content
    } else {
        let registry = AgentRegistry::new();
        registry
            .get_agent("nova")
            .map(|agent| agent.system_prompt_template.clone())
            .unwrap_or_else(|| prompts::require_system_prompt("nova-core-v1"))
    };

    // Capture history for request
    let history = agent_state.chat_history.clone();

    // Release lock before long-running async call
    drop(agent_state);

    // Fetch learning context (best-effort, non-fatal — empty string if DB unavailable)
    let learning_snippet = {
        let db_guard = db.lock().await;
        db_guard
            .as_ref()
            .map(|svc| svc.get_learning_context_snippet())
            .unwrap_or_default()
    };

    // Augment system prompt with learning context, capped to avoid token bloat
    let system_prompt = if learning_snippet.is_empty() {
        system_prompt
    } else {
        let snippet = if learning_snippet.chars().count() > 200 {
            learning_snippet.chars().take(200).collect::<String>() + "..."
        } else {
            learning_snippet
        };
        format!(
            "{}\n\n## Active Learning Context\n{}",
            system_prompt, snippet
        )
    };

    match dispatch_model_request(
        &message,
        history,
        &system_prompt,
        &active_model,
        &config,
        &db,
    )
    .await
    {
        Ok(res) => {
            // Re-acquire lock to update history
            let mut agent_state = state.lock().await;

            // Append User Message
            agent_state.chat_history.push(ChatMessage {
                role: "user".to_string(),
                content: Some(message.clone()),
                tool_calls: None,
                tool_call_id: None,
                name: None,
                reasoning_content: None,
            });

            // Append Assistant Response (only if non-empty to prevent API errors)
            if !res.trim().is_empty() {
                agent_state.chat_history.push(ChatMessage {
                    role: "assistant".to_string(),
                    content: Some(res.clone()),
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                    reasoning_content: None,
                });
            }

            // Keep last 40 messages to prevent unbounded memory growth (~20 turns)
            if agent_state.chat_history.len() > MAX_HISTORY_MESSAGES {
                let drain_count = agent_state.chat_history.len() - MAX_HISTORY_MESSAGES;
                agent_state.chat_history.drain(0..drain_count);
            }

            // Legacy support
            agent_state.active_conversations.push(message);
            Ok(res)
        }
        Err(e) => {
            // Log failure to DB
            let db_guard = db.lock().await;
            if let Some(service) = db_guard.as_ref() {
                let _ = service.log_activity("System Error: Chat Failed", &e);
            }
            Err(format!("Chat Error: {}", e))
        }
    }
}

#[tauri::command]
pub async fn set_active_model(model: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut agent_state = state.lock().await;
    agent_state.active_model = model.clone();
    info!("Active model set to: {}", model);
    Ok(())
}

#[tauri::command]
pub async fn get_agent_status(
    state: State<'_, AppState>,
    db: State<'_, std::sync::Arc<tokio::sync::Mutex<Option<database::DatabaseService>>>>,
) -> Result<crate::modules::state::AgentState, String> {
    let mut agent_state = state.lock().await;

    if let Some(service) = db.lock().await.as_ref() {
        if let Ok(count) = service.get_memory_count() {
            agent_state.memory_count = count as usize;
        }
    }

    Ok(agent_state.clone())
}

#[tauri::command]
pub async fn update_capabilities(
    capabilities: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut agent_state = state.lock().await;
    agent_state.capabilities = capabilities;
    info!("Updated agent capabilities");
    Ok(())
}
