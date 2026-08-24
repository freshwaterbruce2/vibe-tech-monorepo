use crate::database;
use crate::modules::credentials::{keys, CredentialStore};
use crate::modules::state::{ChatMessage, Config};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use tracing::info;

use super::protocol::{get_tools, ChatCompletionRequest, ChatCompletionResponse, ThinkingConfig};
use super::tools::{execute_tool_call, record_tool_call_outcome};

/// OpenRouter-compatible endpoints that do not require a client-side API key because
/// the local proxy injects the upstream credential.
fn is_local_proxy(base_url: &str) -> bool {
    let lower = base_url.to_lowercase();
    lower.starts_with("http://localhost:3001/") || lower.starts_with("http://127.0.0.1:3001/")
}

async fn call_openai_compatible(
    api_key: &str,
    base_url: &str,
    models: &[String],
    user_message: &str,
    history: Vec<ChatMessage>,
    system_prompt: &str,
    supports_tools: bool,
    db: Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let tools = if supports_tools {
        Some(get_tools())
    } else {
        None
    };
    let tool_choice = if supports_tools {
        Some("auto".to_string())
    } else {
        None
    };

    let mut initial_messages = vec![ChatMessage {
        role: "system".to_string(),
        content: Some(system_prompt.to_string()),
        tool_calls: None,
        tool_call_id: None,
        name: None,
        reasoning_content: None,
    }];

    // Add history (previous conversation)
    // Filter out any assistant messages with empty content (no tool_calls)
    // Moonshot/Kimi K2.5 rejects assistant messages with empty content
    for msg in history {
        let dominated_empty = msg.role == "assistant"
            && msg.tool_calls.is_none()
            && msg.content.as_ref().map_or(true, |c| c.trim().is_empty());
        if !dominated_empty {
            initial_messages.push(msg);
        }
    }

    // Add current user message
    initial_messages.push(ChatMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_calls: None,
        tool_call_id: None,
        name: None,
        reasoning_content: None,
    });

    let max_iterations = 15; // Increased for complex multi-tool tasks
    let mut cascade_errors: Vec<String> = Vec::new();
    let mut last_assistant_content: Option<String> = None;

    // Cascade through models: if one fails, try the next.
    for model in models {
        let mut messages = initial_messages.clone();
        let mut model_failed = false;

        for _ in 0..max_iterations {
            // Kimi K2.5 Configuration:
            // - Temperature: 0.6 (instant mode) when using tools
            // - Thinking mode disabled for tool calling (avoids reasoning_content requirement)
            // - Max tokens: 32768 (Kimi supports up to 64K output)
            // - Context: 262K tokens
            // See: https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart
            let request = ChatCompletionRequest {
                model: model.to_string(),
                messages: messages.clone(),
                temperature: 0.6, // Instant mode for tool calling
                max_tokens: 32768,
                tools: tools.clone(),
                tool_choice: tool_choice.clone(),
                stream: Some(false),
                thinking: Some(ThinkingConfig {
                    r#type: "disabled".to_string(),
                }),
            };

            // Treat `base_url` as an OpenAI-compatible API base (e.g. `.../v1` or `.../openai/v1`).
            // This keeps provider integration consistent across DeepSeek, Groq, and Hugging Face.
            let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

            let mut req_builder = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&request);
            if !api_key.is_empty() {
                req_builder = req_builder.header("Authorization", format!("Bearer {}", api_key));
            }

            let response_res = req_builder.send().await;

            let response = match response_res {
                Ok(res) => res,
                Err(e) => {
                    cascade_errors.push(format!("Request failed for model {}: {}", model, e));
                    model_failed = true;
                    break;
                }
            };

            if !response.status().is_success() {
                let status = response.status();
                let error_text = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown error".to_string());
                cascade_errors.push(format!(
                    "API error {} for model {}: {}",
                    status, model, error_text
                ));
                model_failed = true;
                break;
            }

            let data: ChatCompletionResponse = match response.json().await {
                Ok(d) => d,
                Err(e) => {
                    cascade_errors.push(format!(
                        "Failed to parse response for model {}: {}",
                        model, e
                    ));
                    model_failed = true;
                    break;
                }
            };

            if let Some(choice) = data.choices.first() {
                let message = &choice.message;

                messages.push(message.clone());
                if message.role == "assistant" && message.content.is_some() {
                    last_assistant_content = message.content.clone();
                }

                // Check if model wants to call tools
                if let Some(tool_calls) = &message.tool_calls {
                    if !tool_calls.is_empty() {
                        info!("Executing {} tool call(s)...", tool_calls.len());
                        for tool_call in tool_calls {
                            let result = match tokio::time::timeout(
                                std::time::Duration::from_secs(30),
                                execute_tool_call(tool_call, db.clone()),
                            )
                            .await
                            {
                                Ok(result) => result,
                                Err(_) => {
                                    let result = format!(
                                        "Tool '{}' timed out after 30s",
                                        tool_call.function.name
                                    );
                                    record_tool_call_outcome(tool_call, &db, &result).await;
                                    result
                                }
                            };

                            messages.push(ChatMessage {
                                role: "tool".to_string(),
                                content: Some(result),
                                tool_calls: None,
                                tool_call_id: Some(tool_call.id.clone()),
                                name: Some(tool_call.function.name.clone()),
                                reasoning_content: None,
                            });
                        }
                        continue; // Continue loop to get model's response to tool results
                    }
                }

                // No tool calls - return the content
                let final_content = message.content.clone().unwrap_or_default();
                if final_content.trim().is_empty() {
                    return Ok("I processed your request but didn't generate a text response. Could you try rephrasing?".to_string());
                }
                return Ok(final_content);
            } else {
                cascade_errors.push(format!("No response from provider for model {}", model));
                model_failed = true;
                break;
            }
        }

        // If the inner loop exhausted max_iterations without an explicit error, log it
        // and continue to the next model in the cascade.
        if !model_failed {
            info!(
                "Max iterations reached for model {}, trying next model in cascade",
                model
            );
            cascade_errors.push(format!("Max iterations reached for model {}", model));
        }
    }

    // All models exhausted. Return the last assistant message if available,
    // otherwise report the collected errors.
    if let Some(content) = last_assistant_content {
        info!("Cascade exhausted, returning last assistant response");
        return Ok(content);
    }

    Err(format!(
        "All models in cascade failed. Errors: {}",
        cascade_errors.join("; ")
    ))
}

// ==========================================
// Tauri Commands
// ==========================================

/// Helper to get API key from credential store with env fallback
fn get_api_key(key_name: &str, env_var: &str, config_value: &str) -> Option<String> {
    // Try credential store first (keys saved via UI)
    if let Ok(Some(key)) = CredentialStore::get_with_fallback(key_name, env_var) {
        if !key.is_empty() {
            return Some(key);
        }
    }
    // Fallback to config (loaded at startup from env)
    if !config_value.is_empty() {
        return Some(config_value.to_string());
    }
    None
}

/// Resolve provider config from the active_model string.
/// Supported prefixes/values:
///   - "openrouter:<model>" or "openrouter/*" -> OpenRouter
///   - "kimi-*" or "moonshot-*"               -> Moonshot/Kimi
///   - "deepseek-*"                           -> DeepSeek
///   - "groq-*" or "groq:<model>"             -> Groq
///   - "ollama:<model>"                       -> Local Ollama
///   - bare model name                        -> defaults to OpenRouter if key available, else Kimi
struct ProviderConfig {
    api_key: String,
    base_url: String,
    model: String,
    model_cascade: Vec<String>,
    supports_tools: bool,
    provider_name: String,
}

/// Build a model cascade for OpenRouter.
/// Primary: deepseek/deepseek-v3, then the requested model (if different),
/// then free/cheap fallback models.
fn build_openrouter_cascade(requested_model: &str) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut cascade = Vec::new();
    for model in [
        "deepseek/deepseek-v3",
        requested_model,
        "deepseek/deepseek-chat:free",
        "google/gemini-2.0-flash:free",
        "mistralai/mistral-small-3.2-24b-instruct:free",
    ] {
        if seen.insert(model.to_string()) {
            cascade.push(model.to_string());
        }
    }
    cascade
}

fn resolve_provider(active_model: &str, config: &Config) -> Result<ProviderConfig, String> {
    let model_lower = active_model.to_lowercase();

    // --- Ollama (local, no API key needed) ---
    if model_lower.starts_with("ollama:") || model_lower.starts_with("ollama/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("llama3.1")
            .to_string();
        let base_url = std::env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());
        return Ok(ProviderConfig {
            api_key: "ollama".to_string(), // Ollama doesn't need a real key
            base_url,
            model: model.clone(),
            model_cascade: vec![model],
            supports_tools: true,
            provider_name: "Ollama (local)".to_string(),
        });
    }

    // --- OpenRouter ---
    if model_lower.starts_with("openrouter:") || model_lower.starts_with("openrouter/") {
        let requested_model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("deepseek/deepseek-v3")
            .to_string();
        let is_proxy = is_local_proxy(&config.openrouter_base_url);
        let api_key = get_api_key(
            keys::OPENROUTER_API_KEY,
            "OPENROUTER_API_KEY",
            &config.openrouter_api_key,
        )
        .unwrap_or_default();
        if api_key.is_empty() && !is_proxy {
            return Err(
                "OpenRouter API key not configured. Set OPENROUTER_API_KEY in Settings."
                    .to_string(),
            );
        }
        let cascade = build_openrouter_cascade(&requested_model);
        return Ok(ProviderConfig {
            api_key,
            base_url: config.openrouter_base_url.clone(),
            model: cascade[0].clone(),
            model_cascade: cascade,
            supports_tools: true,
            provider_name: "OpenRouter".to_string(),
        });
    }

    // --- Moonshot / Kimi ---
    if model_lower.starts_with("kimi") || model_lower.starts_with("moonshot") {
        let model = if model_lower == "kimi" || model_lower == "moonshot" {
            "kimi-k2.5".to_string()
        } else {
            active_model.to_string()
        };
        let api_key = get_api_key(keys::KIMI_API_KEY, "KIMI_API_KEY", &config.kimi_api_key)
            .ok_or_else(|| {
                "Kimi API key not configured. Set KIMI_API_KEY in Settings.".to_string()
            })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.moonshot.ai/v1".to_string(),
            model: model.clone(),
            model_cascade: vec![model],
            supports_tools: true,
            provider_name: "Moonshot (Kimi)".to_string(),
        });
    }

    // --- DeepSeek ---
    if model_lower.starts_with("deepseek") {
        let model = active_model.to_string();
        let api_key = get_api_key(
            keys::DEEPSEEK_API_KEY,
            "DEEPSEEK_API_KEY",
            &config.deepseek_api_key,
        )
        .ok_or_else(|| {
            "DeepSeek API key not configured. Set DEEPSEEK_API_KEY in Settings.".to_string()
        })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: config.deepseek_base_url.clone(),
            model: model.clone(),
            model_cascade: vec![model],
            supports_tools: true,
            provider_name: "DeepSeek".to_string(),
        });
    }

    // --- Groq ---
    if model_lower.starts_with("groq:") || model_lower.starts_with("groq/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("llama-3.3-70b-versatile")
            .to_string();
        let api_key = get_api_key(keys::GROQ_API_KEY, "GROQ_API_KEY", &config.groq_api_key)
            .ok_or_else(|| {
                "Groq API key not configured. Set GROQ_API_KEY in Settings.".to_string()
            })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.groq.com/openai/v1".to_string(),
            model: model.clone(),
            model_cascade: vec![model],
            supports_tools: true,
            provider_name: "Groq".to_string(),
        });
    }

    // --- Default fallback: try OpenRouter first (most flexible), then Kimi ---
    let is_proxy = is_local_proxy(&config.openrouter_base_url);
    if let Some(api_key) = get_api_key(
        keys::OPENROUTER_API_KEY,
        "OPENROUTER_API_KEY",
        &config.openrouter_api_key,
    ) {
        let cascade = build_openrouter_cascade(active_model);
        return Ok(ProviderConfig {
            api_key,
            base_url: config.openrouter_base_url.clone(),
            model: cascade[0].clone(),
            model_cascade: cascade,
            supports_tools: true,
            provider_name: "OpenRouter (default)".to_string(),
        });
    }
    if is_proxy {
        // Local proxy does not need a client-side key.
        let cascade = build_openrouter_cascade(active_model);
        return Ok(ProviderConfig {
            api_key: String::new(),
            base_url: config.openrouter_base_url.clone(),
            model: cascade[0].clone(),
            model_cascade: cascade,
            supports_tools: true,
            provider_name: "OpenRouter (default, local proxy)".to_string(),
        });
    }

    if let Some(api_key) = get_api_key(keys::KIMI_API_KEY, "KIMI_API_KEY", &config.kimi_api_key) {
        let model = "kimi-k2.5".to_string();
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.moonshot.ai/v1".to_string(),
            model: model.clone(),
            model_cascade: vec![model],
            supports_tools: true,
            provider_name: "Moonshot (Kimi fallback)".to_string(),
        });
    }

    Err(
        "No LLM provider configured. Add an API key in Settings (OpenRouter recommended)."
            .to_string(),
    )
}

pub async fn dispatch_model_request(
    message: &str,
    history: Vec<ChatMessage>,
    system_prompt: &str,
    active_model: &str,
    config: &Config,
    db: &Arc<AsyncMutex<Option<database::DatabaseService>>>,
) -> Result<String, String> {
    let provider = resolve_provider(active_model, config)?;

    info!(
        "LLM Provider: {} | Model: {} | Endpoint: {}",
        provider.provider_name, provider.model, provider.base_url
    );
    info!("API Key present: {}", !provider.api_key.is_empty());
    info!("Model cascade: {:?}", provider.model_cascade);

    call_openai_compatible(
        &provider.api_key,
        &provider.base_url,
        &provider.model_cascade,
        message,
        history,
        system_prompt,
        provider.supports_tools,
        db.clone(),
    )
    .await
}
