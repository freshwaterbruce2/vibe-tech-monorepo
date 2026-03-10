use crate::auth;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL: &str = "gemini-2.5-pro";

const SYSTEM_PROMPT: &str = "\
You are Nova, an AI assistant embedded in the Vibe-Tech Desktop Environment (VTDE). \
You help with coding, system management, and general questions. \
Be concise, technical, and helpful. Use markdown when it improves clarity.";

// ── Frontend ↔ Rust message type ────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub text: String,
}

// ── Gemini API types ────────────────────────────────────

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_instruction: Option<GeminiContent>,
}

#[derive(Serialize, Deserialize)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
    error: Option<GeminiError>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}

#[derive(Deserialize)]
struct GeminiError {
    message: String,
}

// ── Tauri command ───────────────────────────────────────

#[tauri::command]
pub async fn chat_gemini(message: String, history: Vec<ChatMessage>) -> Result<String, String> {
    let token = auth::get_valid_token().await?;

    // Build conversation from history
    let mut contents: Vec<GeminiContent> = history
        .iter()
        .map(|m| GeminiContent {
            role: if m.role == "user" {
                "user".into()
            } else {
                "model".into()
            },
            parts: vec![GeminiPart {
                text: m.text.clone(),
            }],
        })
        .collect();

    // Append current user message
    contents.push(GeminiContent {
        role: "user".into(),
        parts: vec![GeminiPart { text: message }],
    });

    let body = GeminiRequest {
        contents,
        system_instruction: Some(GeminiContent {
            role: "user".into(),
            parts: vec![GeminiPart {
                text: SYSTEM_PROMPT.into(),
            }],
        }),
    };

    let url = format!("{GEMINI_API_BASE}/models/{DEFAULT_MODEL}:generateContent");

    let resp = Client::new()
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gemini request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Gemini API {status}: {text}"));
    }

    let gemini: GeminiResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    if let Some(err) = gemini.error {
        return Err(format!("Gemini error: {}", err.message));
    }

    Ok(gemini
        .candidates
        .and_then(|c| c.into_iter().next())
        .map(|c| {
            c.content
                .parts
                .into_iter()
                .map(|p| p.text)
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_else(|| "No response from Gemini.".into()))
}
