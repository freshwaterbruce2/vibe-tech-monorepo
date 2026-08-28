#![allow(dead_code)]
use anyhow::{Context, Result};
/// WebSocket JWT Authentication Module (2026 Security Best Practice)
///
/// Implements token-based authentication for WebSocket IPC following 2026 standards:
/// - Short-lived tokens (1-hour validity)
/// - Explicit authentication message pattern
/// - Token refresh mechanism
/// - Secure token storage
///
/// References:
/// - https://www.videosdk.live/developer-hub/websocket/websocket-authentication
/// - https://curity.io/resources/learn/jwt-best-practices/
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

/// JWT claims structure for WebSocket authentication
///
/// ## Security Features
/// - `exp`: 1-hour token expiration (2026 best practice)
/// - `iat`: Issued-at timestamp for tracking
/// - `sub`: Client identifier (NOVA Agent instance)
/// - `aud`: Target audience (Vibe Code Studio)
/// - `client_type`: Distinguishes client types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebSocketClaims {
    /// Subject (client ID)
    pub sub: String,

    /// Expiration time (Unix timestamp)
    pub exp: usize,

    /// Issued at (Unix timestamp)
    pub iat: usize,

    /// Audience (target service)
    pub aud: String,

    /// Client type identifier
    pub client_type: String,

    /// Session identifier (for tracking)
    pub session_id: String,
}

/// Authentication message sent immediately after WebSocket connection
///
/// ## 2026 Best Practice
/// Uses "Explicit Authentication Message" pattern:
/// - Client connects via WebSocket
/// - Client immediately sends authentication message with JWT
/// - Server validates JWT before accepting any other messages
/// - Less overhead than authenticating every message
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum AuthMessage {
    #[serde(rename = "auth:authenticate")]
    Authenticate { token: String },

    #[serde(rename = "auth:refresh")]
    RefreshToken { refresh_token: String },

    #[serde(rename = "auth:response")]
    Response {
        success: bool,
        message: String,
        new_token: Option<String>,
    },
}

/// JWT token manager for WebSocket authentication
pub struct TokenManager {
    /// Secret key for JWT signing (stored securely)
    secret_key: String,

    /// Token validity duration (default: 1 hour)
    token_validity: Duration,

    /// Audience (target service)
    audience: String,
}

impl TokenManager {
    /// Create new token manager with secure random key
    ///
    /// ## Security Note
    /// In production, load `secret_key` from Windows Credential Manager
    /// using the `credentials` module.
    pub fn new() -> Self {
        Self::with_config(
            Self::generate_secret_key(),
            Duration::hours(1), // 1-hour validity (2026 best practice)
            "vibe-code-studio".to_string(),
        )
    }

    /// Create token manager with custom configuration
    pub fn with_config(secret_key: String, validity: Duration, audience: String) -> Self {
        Self {
            secret_key,
            token_validity: validity,
            audience,
        }
    }

    /// Generate a secure random secret key (32 bytes)
    ///
    /// ## Production Usage
    /// For production, store this key in Windows Credential Manager:
    /// ```rust
    /// use crate::modules::credentials::{CredentialStore, keys};
    ///
    /// let secret = TokenManager::generate_secret_key();
    /// CredentialStore::set("websocket_jwt_secret", &secret)?;
    /// ```
    fn generate_secret_key() -> String {
        use uuid::Uuid;
        // Generate two UUIDs and concatenate for 256-bit key
        format!("{}{}", Uuid::new_v4(), Uuid::new_v4())
    }

    /// Generate a new JWT token for WebSocket authentication
    ///
    /// # Arguments
    /// * `client_id` - Unique client identifier (e.g., "nova-agent-{uuid}")
    /// * `session_id` - Session identifier for tracking
    ///
    /// # Returns
    /// JWT token string ready to send in authentication message
    pub fn generate_token(&self, client_id: &str, session_id: &str) -> Result<String> {
        let now = Utc::now();
        let exp = (now + self.token_validity).timestamp() as usize;
        let iat = now.timestamp() as usize;

        let claims = WebSocketClaims {
            sub: client_id.to_string(),
            exp,
            iat,
            aud: self.audience.clone(),
            client_type: "nova-agent".to_string(),
            session_id: session_id.to_string(),
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret_key.as_bytes()),
        )
        .context("Failed to generate JWT token")?;

        debug!(
            "Generated JWT token for client {} (expires in {} hours)",
            client_id,
            self.token_validity.num_hours()
        );
        Ok(token)
    }

    /// Validate a JWT token
    ///
    /// # Arguments
    /// * `token` - JWT token string to validate
    ///
    /// # Returns
    /// * `Ok(claims)` - Token valid, returns parsed claims
    /// * `Err` - Token invalid, expired, or malformed
    ///
    /// # Server-Side Usage
    /// This method is used on the server side (Vibe Code Studio) to validate
    /// incoming authentication messages from clients.
    #[allow(dead_code)] // Used server-side
    pub fn validate_token(&self, token: &str) -> Result<WebSocketClaims> {
        let mut validation = Validation::default();
        validation.set_audience(&[&self.audience]);

        let token_data = decode::<WebSocketClaims>(
            token,
            &DecodingKey::from_secret(self.secret_key.as_bytes()),
            &validation,
        )
        .context("Failed to validate JWT token")?;

        debug!("Validated JWT token for client {}", token_data.claims.sub);
        Ok(token_data.claims)
    }

    /// Check if token needs refresh (expires in < 10 minutes)
    ///
    /// ## Token Refresh Strategy
    /// - Client checks token expiration before sending messages
    /// - If expires in < 10 minutes, request new token
    /// - Server issues new token via `auth:response` message
    #[allow(dead_code)] // Used for token refresh mechanism
    pub fn needs_refresh(&self, claims: &WebSocketClaims) -> bool {
        let now = Utc::now().timestamp() as usize;
        let time_until_expiry = claims.exp.saturating_sub(now);
        let ten_minutes = 600; // seconds

        time_until_expiry < ten_minutes
    }

    /// Generate authentication message for WebSocket handshake
    ///
    /// ## Usage Pattern (2026 Best Practice)
    /// ```rust
    /// // 1. Connect to WebSocket
    /// let (ws_stream, _) = connect_async("wss://vibe-code-studio").await?;
    ///
    /// // 2. Immediately send authentication message
    /// let auth_msg = token_manager.create_auth_message(&client_id, &session_id)?;
    /// ws_stream.send(Message::Text(serde_json::to_string(&auth_msg)?)).await?;
    ///
    /// // 3. Wait for auth:response before sending other messages
    /// // 4. Proceed with normal IPC messages
    /// ```
    pub fn create_auth_message(&self, client_id: &str, session_id: &str) -> Result<AuthMessage> {
        let token = self.generate_token(client_id, session_id)?;
        Ok(AuthMessage::Authenticate { token })
    }

    /// Create authentication response message (server-side)
    #[allow(dead_code)] // Used server-side
    pub fn create_auth_response(
        success: bool,
        message: String,
        new_token: Option<String>,
    ) -> AuthMessage {
        AuthMessage::Response {
            success,
            message,
            new_token,
        }
    }
}

impl Default for TokenManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Authentication state tracker
///
/// Tracks authentication status per WebSocket connection
#[derive(Debug, Clone)]
#[allow(dead_code)] // Reserved for future server-side validation
pub struct AuthState {
    pub authenticated: bool,
    pub client_id: Option<String>,
    pub session_id: Option<String>,
    pub token_expires_at: Option<usize>,
}

impl AuthState {
    pub fn new() -> Self {
        Self {
            authenticated: false,
            client_id: None,
            session_id: None,
            token_expires_at: None,
        }
    }

    pub fn authenticate(&mut self, claims: &WebSocketClaims) {
        self.authenticated = true;
        self.client_id = Some(claims.sub.clone());
        self.session_id = Some(claims.session_id.clone());
        self.token_expires_at = Some(claims.exp);
        info!("Client {} authenticated successfully", claims.sub);
    }

    pub fn is_expired(&self) -> bool {
        if let Some(exp) = self.token_expires_at {
            let now = Utc::now().timestamp() as usize;
            now >= exp
        } else {
            true // No token = expired
        }
    }

    pub fn clear(&mut self) {
        self.authenticated = false;
        self.client_id = None;
        self.session_id = None;
        self.token_expires_at = None;
        warn!("Authentication state cleared");
    }
}

impl Default for AuthState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation_and_validation() {
        let manager = TokenManager::new();
        let client_id = "nova-agent-test-123";
        let session_id = "session-xyz";

        // Generate token
        let token = manager.generate_token(client_id, session_id).unwrap();
        assert!(!token.is_empty());

        // Validate token
        let claims = manager.validate_token(&token).unwrap();
        assert_eq!(claims.sub, client_id);
        assert_eq!(claims.session_id, session_id);
        assert_eq!(claims.aud, "vibe-code-studio");
        assert_eq!(claims.client_type, "nova-agent");
    }

    #[test]
    fn test_token_expiration() {
        // Create a token already expired beyond default JWT leeway.
        let manager = TokenManager::with_config(
            TokenManager::generate_secret_key(),
            Duration::seconds(-120),
            "test".to_string(),
        );

        let token = manager.generate_token("test", "session").unwrap();

        // Should fail validation due to expiration
        assert!(manager.validate_token(&token).is_err());
    }

    #[test]
    fn test_needs_refresh() {
        let manager = TokenManager::with_config(
            TokenManager::generate_secret_key(),
            Duration::minutes(5), // 5-minute token
            "test".to_string(),
        );

        let token = manager.generate_token("test", "session").unwrap();
        let claims = manager.validate_token(&token).unwrap();

        // Should need refresh (expires in < 10 minutes)
        assert!(manager.needs_refresh(&claims));
    }

    #[test]
    fn test_auth_state() {
        let mut state = AuthState::new();
        assert!(!state.authenticated);

        let claims = WebSocketClaims {
            sub: "test-client".to_string(),
            exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
            aud: "test".to_string(),
            client_type: "nova-agent".to_string(),
            session_id: "session-123".to_string(),
        };

        state.authenticate(&claims);
        assert!(state.authenticated);
        assert_eq!(state.client_id.as_deref(), Some("test-client"));
        assert!(!state.is_expired());

        state.clear();
        assert!(!state.authenticated);
        assert!(state.is_expired());
    }

    #[test]
    fn test_auth_message_serialization() {
        let auth_msg = AuthMessage::Authenticate {
            token: "test-token-123".to_string(),
        };

        let json = serde_json::to_string(&auth_msg).unwrap();
        assert!(json.contains("auth:authenticate"));
        assert!(json.contains("test-token-123"));

        let deserialized: AuthMessage = serde_json::from_str(&json).unwrap();
        match deserialized {
            AuthMessage::Authenticate { token } => assert_eq!(token, "test-token-123"),
            _ => panic!("Wrong message type"),
        }
    }
}
