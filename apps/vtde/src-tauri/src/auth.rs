use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL: &str = "https://www.googleapis.com/oauth2/v2/userinfo";

// ── Config & Token types ────────────────────────────────

#[derive(Deserialize)]
pub struct OAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    #[serde(default = "default_scopes")]
    pub scopes: Vec<String>,
    #[serde(default = "default_port")]
    pub redirect_port: u16,
}

fn default_scopes() -> Vec<String> {
    vec![
        "https://www.googleapis.com/auth/generative-language".into(),
        "openid".into(),
        "email".into(),
    ]
}
fn default_port() -> u16 {
    8734
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenData {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: u64,
    pub email: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub email: Option<String>,
    pub expires_at: Option<u64>,
}

// ── Paths ───────────────────────────────────────────────

fn data_dir() -> PathBuf {
    PathBuf::from(r"D:\data\vtde")
}

fn config_path() -> PathBuf {
    data_dir().join("oauth_config.json")
}

fn tokens_path() -> PathBuf {
    data_dir().join("auth_tokens.json")
}

// ── Persistence helpers ─────────────────────────────────

fn load_config() -> Result<OAuthConfig, String> {
    let path = config_path();
    let content = fs::read_to_string(&path).map_err(|_| {
        format!(
            "OAuth config not found at {}. Create it with your GCP client_id and client_secret.",
            path.display()
        )
    })?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid OAuth config: {e}"))
}

pub fn load_tokens() -> Option<TokenData> {
    let content = fs::read_to_string(tokens_path()).ok()?;
    serde_json::from_str(&content).ok()
}

fn save_tokens(tokens: &TokenData) -> Result<(), String> {
    fs::create_dir_all(data_dir()).map_err(|e| format!("Failed to create data dir: {e}"))?;
    let json =
        serde_json::to_string_pretty(tokens).map_err(|e| format!("Serialize error: {e}"))?;
    fs::write(tokens_path(), json).map_err(|e| format!("Failed to save tokens: {e}"))
}

// ── PKCE helpers ────────────────────────────────────────

fn generate_code_verifier() -> String {
    let bytes: [u8; 32] = rand::random();
    URL_SAFE_NO_PAD.encode(bytes)
}

fn generate_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hash)
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn extract_auth_code(request: &str) -> Result<String, String> {
    let first_line = request.lines().next().ok_or("Empty request")?;
    let path = first_line
        .split_whitespace()
        .nth(1)
        .ok_or("No path in request")?;
    let query = path.split('?').nth(1).ok_or("No query parameters")?;

    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("code=") {
            return urlencoding::decode(value)
                .map(|v| v.into_owned())
                .map_err(|e| format!("Decode error: {e}"));
        }
    }
    for param in query.split('&') {
        if let Some(value) = param.strip_prefix("error=") {
            return Err(format!("OAuth denied: {value}"));
        }
    }
    Err("No authorization code in callback".into())
}

async fn fetch_user_email(client: &Client, token: &str) -> Result<String, String> {
    let json: serde_json::Value = client
        .get(GOOGLE_USERINFO_URL)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Userinfo request failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Userinfo parse failed: {e}"))?;
    json["email"]
        .as_str()
        .map(String::from)
        .ok_or_else(|| "No email in userinfo".into())
}

// ── Token refresh ───────────────────────────────────────

async fn refresh_access_token() -> Result<TokenData, String> {
    let config = load_config()?;
    let old = load_tokens().ok_or("No stored tokens to refresh")?;
    let refresh = old.refresh_token.as_ref().ok_or("No refresh token")?;

    let client = Client::new();
    let resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("refresh_token", refresh.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Refresh request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh error: {body}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = json["access_token"]
        .as_str()
        .ok_or("No access_token in refresh")?
        .to_string();
    let expires_in = json["expires_in"].as_u64().unwrap_or(3600);

    let tokens = TokenData {
        access_token,
        refresh_token: old.refresh_token, // Google may not return a new one
        expires_at: now_secs() + expires_in,
        email: old.email,
    };
    save_tokens(&tokens)?;
    Ok(tokens)
}

/// Returns a valid access token, refreshing if expired.
pub async fn get_valid_token() -> Result<String, String> {
    let tokens = load_tokens().ok_or("Not authenticated. Please sign in first.")?;
    if now_secs() >= tokens.expires_at.saturating_sub(60) {
        let refreshed = refresh_access_token().await?;
        Ok(refreshed.access_token)
    } else {
        Ok(tokens.access_token)
    }
}

// ── Tauri commands ──────────────────────────────────────

#[tauri::command]
pub async fn start_oauth() -> Result<AuthStatus, String> {
    let config = load_config()?;
    let verifier = generate_code_verifier();
    let challenge = generate_code_challenge(&verifier);
    let port = config.redirect_port;
    let redirect_uri = format!("http://localhost:{port}");

    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&\
         code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        GOOGLE_AUTH_URL,
        urlencoding::encode(&config.client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&config.scopes.join(" ")),
        urlencoding::encode(&challenge),
    );

    // Bind BEFORE opening browser so the port is ready
    let listener = TcpListener::bind(format!("127.0.0.1:{port}"))
        .await
        .map_err(|e| format!("Port {port} unavailable: {e}"))?;

    open::that(&auth_url).map_err(|e| format!("Cannot open browser: {e}"))?;

    // Wait for Google redirect
    let (mut stream, _) = listener
        .accept()
        .await
        .map_err(|e| format!("Accept failed: {e}"))?;

    let mut buf = vec![0u8; 4096];
    let n = stream
        .read(&mut buf)
        .await
        .map_err(|e| format!("Read failed: {e}"))?;
    let request = String::from_utf8_lossy(&buf[..n]);
    let code = extract_auth_code(&request)?;

    // Respond to browser
    let html = "<html><body style='font-family:system-ui;text-align:center;padding:60px'>\
                <h1>✅ Authenticated!</h1>\
                <p>Return to VTDE — you can close this tab.</p></body></html>";
    let resp = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\n\r\n{html}",
        html.len()
    );
    stream.write_all(resp.as_bytes()).await.ok();
    drop(stream);
    drop(listener);

    // Exchange code for tokens
    let client = Client::new();
    let token_resp = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("code", code.as_str()),
            ("client_id", config.client_id.as_str()),
            ("client_secret", config.client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {e}"))?;

    if !token_resp.status().is_success() {
        let body = token_resp.text().await.unwrap_or_default();
        return Err(format!("Token exchange error: {body}"));
    }

    let json: serde_json::Value = token_resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {e}"))?;

    let access_token = json["access_token"]
        .as_str()
        .ok_or("Missing access_token")?
        .to_string();
    let refresh_token = json["refresh_token"].as_str().map(String::from);
    let expires_in = json["expires_in"].as_u64().unwrap_or(3600);

    let email = fetch_user_email(&client, &access_token).await.ok();

    let tokens = TokenData {
        access_token,
        refresh_token,
        expires_at: now_secs() + expires_in,
        email: email.clone(),
    };
    save_tokens(&tokens)?;

    Ok(AuthStatus {
        authenticated: true,
        email,
        expires_at: Some(tokens.expires_at),
    })
}

#[tauri::command]
pub async fn get_auth_status() -> Result<AuthStatus, String> {
    match load_tokens() {
        Some(t) if now_secs() < t.expires_at => Ok(AuthStatus {
            authenticated: true,
            email: t.email,
            expires_at: Some(t.expires_at),
        }),
        Some(_) => match refresh_access_token().await {
            Ok(r) => Ok(AuthStatus {
                authenticated: true,
                email: r.email,
                expires_at: Some(r.expires_at),
            }),
            Err(_) => Ok(AuthStatus {
                authenticated: false,
                email: None,
                expires_at: None,
            }),
        },
        None => Ok(AuthStatus {
            authenticated: false,
            email: None,
            expires_at: None,
        }),
    }
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    let path = tokens_path();
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Delete failed: {e}"))?;
    }
    Ok(())
}
