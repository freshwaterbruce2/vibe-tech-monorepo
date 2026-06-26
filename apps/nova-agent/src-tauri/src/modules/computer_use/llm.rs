use tracing::info;

use crate::modules::credentials::{keys, CredentialStore};
use super::types::MultimodalMessage;

fn get_api_key(key_name: &str, env_var: &str) -> Option<String> {
    if let Ok(Some(key)) = CredentialStore::get_with_fallback(key_name, env_var) {
        if !key.is_empty() {
            return Some(key);
        }
    }
    None
}

#[tauri::command]
pub async fn call_multimodal_llm(
    messages: Vec<MultimodalMessage>,
    system_prompt: Option<String>,
) -> Result<String, String> {
    info!("Calling multimodal LLM (Gemini)...");

    let mut api_key = get_api_key(keys::GOOGLE_API_KEY, "GOOGLE_API_KEY");
    let mut base_url = "https://generativelanguage.googleapis.com/v1beta/openai".to_string();
    let mut model = "gemini-2.5-flash".to_string();

    if api_key.is_none() {
        if let Some(or_key) = get_api_key(keys::OPENROUTER_API_KEY, "OPENROUTER_API_KEY") {
            api_key = Some(or_key);
            base_url = "https://openrouter.ai/api/v1".to_string();
            model = "google/gemini-2.5-flash".to_string();
        }
    }

    let key = api_key.ok_or_else(|| {
        "No API key configured for Gemini or OpenRouter. Please configure GOOGLE_API_KEY or OPENROUTER_API_KEY in Settings.".to_string()
    })?;

    let mut request_messages = Vec::new();

    if let Some(sys) = system_prompt {
        request_messages.push(serde_json::json!({
            "role": "system",
            "content": sys
        }));
    }

    for msg in messages {
        let content = if let Some(img) = msg.image_base64 {
            serde_json::json!([
                {
                    "type": "text",
                    "text": msg.text
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": format!("data:image/png;base64,{}", img)
                    }
                }
            ])
        } else {
            serde_json::json!(msg.text)
        };

        request_messages.push(serde_json::json!({
            "role": msg.role,
            "content": content
        }));
    }

    let payload = serde_json::json!({
        "model": model,
        "messages": request_messages,
        "temperature": 0.2,
        "max_tokens": 4096
    });

    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to LLM: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("LLM API returned error {}: {}", status, error_text));
    }

    let res_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

    let text = res_json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| format!("Invalid response format: {:?}", res_json))?
        .to_string();

    Ok(text)
}
