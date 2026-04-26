use crate::database;
use crate::modules::credentials::{keys, CredentialStore};
use crate::modules::state::{ChatMessage, Config};
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use tracing::info;

use super::protocol::{get_tools, ChatCompletionRequest, ChatCompletionResponse, ThinkingConfig};
use super::tools::{execute_tool_call, record_tool_call_outcome};
async fn call_openai_compatible(
    api_key: &str,
    base_url: &str,
    model: &str,
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

    let mut messages = vec![ChatMessage {
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
            messages.push(msg);
        }
    }

    // Add current user message
    messages.push(ChatMessage {
        role: "user".to_string(),
        content: Some(user_message.to_string()),
        tool_calls: None,
        tool_call_id: None,
        name: None,
        reasoning_content: None,
    });

    let max_iterations = 15; // Increased for complex multi-tool tasks

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

        let response_res = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await;

        let response = match response_res {
            Ok(res) => res,
            Err(e) => return Err(format!("Request failed: {}", e)),
        };

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("API error {}: {}", status, error_text));
        }

        let data: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        if let Some(choice) = data.choices.first() {
            let message = &choice.message;

            messages.push(message.clone());

            // Check if model wants to call tools
            if let Some(tool_calls) = &message.tool_calls {
                if !tool_calls.is_empty() {
                    info!("🔧 Executing {} tool call(s)...", tool_calls.len());
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
            return Err("No response from provider".to_string());
        }
    }

    // Max iterations reached - return last assistant message if available
    info!("⚠️ Max iterations reached, returning last response");
    for msg in messages.iter().rev() {
        if msg.role == "assistant" && msg.content.is_some() {
            return Ok(msg.content.clone().unwrap_or_default());
        }
    }

    Err("Max iterations reached - model stuck in tool loop".to_string())
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
///   - "openrouter:<model>" or "openrouter/*" → OpenRouter
///   - "kimi-*" or "moonshot-*"               → Moonshot/Kimi
///   - "deepseek-*"                           → DeepSeek
///   - "groq-*" or "groq:<model>"             → Groq
///   - "ollama:<model>"                       → Local Ollama
///   - bare model name                        → defaults to OpenRouter if key available, else Kimi
struct ProviderConfig {
    api_key: String,
    base_url: String,
    model: String,
    supports_tools: bool,
    provider_name: String,
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
            model,
            supports_tools: true,
            provider_name: "Ollama (local)".to_string(),
        });
    }

    // --- OpenRouter ---
    if model_lower.starts_with("openrouter:") || model_lower.starts_with("openrouter/") {
        let model = active_model
            .splitn(2, |c| c == ':' || c == '/')
            .nth(1)
            .unwrap_or("anthropic/claude-sonnet-4")
            .to_string();
        let api_key = get_api_key(
            keys::OPENROUTER_API_KEY,
            "OPENROUTER_API_KEY",
            &config.openrouter_api_key,
        )
        .ok_or_else(|| {
            "OpenRouter API key not configured. Set OPENROUTER_API_KEY in Settings.".to_string()
        })?;
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            model,
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
            model,
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
            model,
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
            model,
            supports_tools: true,
            provider_name: "Groq".to_string(),
        });
    }

    // --- Default fallback: try OpenRouter first (most flexible), then Kimi ---
    if let Some(api_key) = get_api_key(
        keys::OPENROUTER_API_KEY,
        "OPENROUTER_API_KEY",
        &config.openrouter_api_key,
    ) {
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://openrouter.ai/api/v1".to_string(),
            model: active_model.to_string(),
            supports_tools: true,
            provider_name: "OpenRouter (default)".to_string(),
        });
    }

    if let Some(api_key) = get_api_key(keys::KIMI_API_KEY, "KIMI_API_KEY", &config.kimi_api_key) {
        return Ok(ProviderConfig {
            api_key,
            base_url: "https://api.moonshot.ai/v1".to_string(),
            model: "kimi-k2.5".to_string(),
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
    info!(
        "API Key: {}...",
        &provider.api_key[..8.min(provider.api_key.len())]
    );

    call_openai_compatible(
        &provider.api_key,
        &provider.base_url,
        &provider.model,
        message,
        history,
        system_prompt,
        provider.supports_tools,
        db.clone(),
    )
    .await
}
