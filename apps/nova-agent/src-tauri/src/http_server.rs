//! HTTP Server for Nova Mobile Bridge
//! Exposes REST API endpoints for mobile app communication

use axum::{
    extract::{Path, Query, Request, State},
    http::{header, Method, StatusCode},
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;
use std::time::{Duration as StdDuration, Instant};
use tokio::sync::Mutex as AsyncMutex;
use tower_http::cors::CorsLayer;

use crate::database::DatabaseService;
use crate::modules::llm;
use crate::modules::state::Config;

/// Shared application state for Axum
pub struct AppState {
    #[allow(dead_code)]
    pub app_state: Arc<AsyncMutex<crate::modules::state::AgentState>>,
    pub config: Config,
    pub db: Arc<AsyncMutex<Option<DatabaseService>>>,
    pub started_at: Instant,
}

/// Request body for chat endpoint
#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    #[serde(default)]
    #[allow(dead_code)]
    pub project_id: Option<String>,
}

/// Response body for chat endpoint
#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub content: String,
}

/// Response body for status endpoint - matches mobile AgentState interface
#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub status: String,
    pub version: String,
    pub ready: bool,
    #[serde(rename = "currentTask", skip_serializing_if = "Option::is_none")]
    pub current_task: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,
}

/// Error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

const MAX_ORIGIN_COUNT: usize = 64;
const MAX_QUERY_LENGTH: usize = 1024;
const DEFAULT_MOBILE_BRIDGE_PORT: u16 = 3000;

fn mobile_lan_enabled() -> bool {
    env::var("NOVA_MOBILE_LAN_ENABLED")
        .map(|value| matches!(value.to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(false)
}

pub fn bridge_port_from_env() -> u16 {
    env::var("NOVA_MOBILE_BRIDGE_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port > 0)
        .unwrap_or(DEFAULT_MOBILE_BRIDGE_PORT)
}

/// Detect local network IP addresses for LAN mobile access
fn local_ip_addresses() -> std::io::Result<Vec<String>> {
    let mut addrs = Vec::new();
    let hostname = std::net::UdpSocket::bind("0.0.0.0:0")?;
    // Connect to a public address to determine the local interface IP
    if hostname.connect("8.8.8.8:80").is_ok() {
        if let Ok(local_addr) = hostname.local_addr() {
            addrs.push(local_addr.ip().to_string());
        }
    }
    Ok(addrs)
}

fn load_allowed_origins() -> Vec<String> {
    env::var("NOVA_MOBILE_ALLOWED_ORIGINS")
        .ok()
        .and_then(|raw| {
            let values: Vec<String> = raw
                .split([',', ';'])
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .map(|v| v.to_string())
                .take(MAX_ORIGIN_COUNT)
                .collect();
            if values.is_empty() {
                None
            } else {
                Some(values)
            }
        })
        .unwrap_or_else(|| {
            let mut origins = vec![
                "http://127.0.0.1:1420".to_string(),
                "http://localhost:1420".to_string(),
                "http://127.0.0.1:5173".to_string(),
                "http://localhost:5173".to_string(),
            ];
            if mobile_lan_enabled() {
                let port = bridge_port_from_env();
                if let Ok(addrs) = local_ip_addresses() {
                    for addr in addrs {
                        origins.push(format!("http://{}:{}", addr, port));
                        origins.push(format!("http://{}:1420", addr));
                    }
                }
            }
            origins
        })
        .into_iter()
        .filter(|origin| origin.len() <= MAX_QUERY_LENGTH)
        .collect()
}

/// POST /chat - Send a message to Nova
async fn chat_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, (StatusCode, Json<ErrorResponse>)> {
    tracing::info!("Mobile bridge: chat request received");

    // We clone the config for each request as it's required by process_chat
    // If Config is heavy, we might want to refactor process_chat to take &Config

    // Placeholder values for history, system_prompt, and active_model
    // These would typically be derived from the payload or application state
    let history = vec![]; // Example: empty history
    let system_prompt = "You are a helpful assistant.".to_string(); // Example: default system prompt
    let active_model =
        std::env::var("NOVA_DEFAULT_MODEL").unwrap_or_else(|_| "kimi-k2.5".to_string());

    match llm::dispatch_model_request(
        &payload.message,
        history,
        &system_prompt,
        &active_model,
        &state.config,
        &state.db,
    )
    .await
    {
        Ok(response) => {
            tracing::info!("Mobile bridge: chat response sent");
            Ok(Json(ChatResponse { content: response }))
        }
        Err(e) => {
            tracing::error!("Mobile bridge: chat error: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Chat failed: {}", e),
                }),
            ))
        }
    }
}

/// GET /status - Get Nova agent status (matches mobile AgentState type)
async fn status_handler(State(state): State<Arc<AppState>>) -> Json<StatusResponse> {
    let db_guard = state.db.lock().await;
    let ready = db_guard.is_some();

    let agent_state = state.app_state.lock().await;
    // Map to mobile-expected values: 'idle' | 'busy' | 'error' | 'offline'
    let status = if !ready {
        "offline"
    } else if agent_state.current_project.is_some() {
        "busy"
    } else {
        "idle"
    };

    Json(StatusResponse {
        status: status.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        ready,
        current_task: agent_state.current_project.clone(),
        capabilities: Some(agent_state.capabilities.clone()),
    })
}

/// Request parameters for memory search
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub query: String,
}

/// GET /memories/search - Search stored memories
async fn memories_search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorResponse>)> {
    if params.query.trim().is_empty() {
        return Ok(Json(serde_json::json!({ "results": [] })));
    }

    let service = crate::modules::memory::MemoryService::new(state.db.clone());
    match service.search(&params.query, None).await {
        Ok(results) => {
            // Return array of strings (content) to match the expected format
            let contents: Vec<String> = results.into_iter().map(|r| r.memory.content).collect();
            Ok(Json(serde_json::json!({ "results": contents })))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Memory search failed: {}", e),
            }),
        )),
    }
}

/// GET /projects - List available projects
async fn projects_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<crate::modules::project::ProjectInfo>>, (StatusCode, Json<ErrorResponse>)> {
    match crate::modules::project::list_projects_in_root(&state.config.workspace_root) {
        Ok(projects) => Ok(Json(projects)),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to list projects: {}", e),
            }),
        )),
    }
}

/// Response format for project detail
#[derive(Debug, Serialize)]
pub struct ProjectDetailResponse {
    #[serde(flatten)]
    pub info: crate::modules::project::ProjectInfo,
    pub state: Option<crate::modules::project::ProjectStateFile>,
}

/// GET /projects/:id - Get specific project details
async fn project_detail_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<ProjectDetailResponse>, (StatusCode, Json<ErrorResponse>)> {
    match crate::modules::project::list_projects_in_root(&state.config.workspace_root) {
        Ok(projects) => {
            if let Some(project) = projects.into_iter().find(|p| p.id == id) {
                let mut state = None;
                if project.has_state {
                    state = crate::modules::project::get_project_state(project.path.clone())
                        .await
                        .ok();
                }
                Ok(Json(ProjectDetailResponse {
                    info: project,
                    state,
                }))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ErrorResponse {
                        error: format!("Project '{}' not found", id),
                    }),
                ))
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to get project: {}", e),
            }),
        )),
    }
}

/// Request for device registration
#[derive(Debug, Deserialize)]
pub struct DeviceRegisterRequest {
    #[serde(rename = "pushToken")]
    pub push_token: String,
}

/// POST /devices/register - Register push notification token
async fn devices_register_handler(
    Json(payload): Json<DeviceRegisterRequest>,
) -> Json<serde_json::Value> {
    if payload.push_token.is_empty() {
        // We shouldn't really reach here if we use standard validation, but just return success true for now
        tracing::warn!("Empty push token received");
    } else {
        tracing::info!(
            "[Nova Server] Registered push token ({} chars)",
            payload.push_token.chars().count()
        );
    }
    Json(serde_json::json!({ "success": true, "message": "Device registered" }))
}

/// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub uptime: u64,
}

/// GET /health - Health check with uptime
async fn health_handler(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        uptime: state.started_at.elapsed().as_secs(),
    })
}

/// Middleware to check Authorization header matches the config token
async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if req.method() == Method::OPTIONS {
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let expected_token = &state.config.mobile_bridge_token;

    // Support either "Bearer <token>" or just "<token>"
    let is_authorized = match auth_header {
        Some(header_val) => {
            let token = header_val.trim_start_matches("Bearer ").trim();
            token == expected_token
        }
        None => false,
    };

    if is_authorized {
        Ok(next.run(req).await)
    } else {
        tracing::warn!("Mobile bridge: Unauthorized access attempt");
        Err(StatusCode::UNAUTHORIZED)
    }
}

/// Create the Axum router with all endpoints
pub fn create_router(state: Arc<AppState>) -> Router {
    let allowed_origins: Vec<_> = load_allowed_origins()
        .into_iter()
        .filter_map(|origin| origin.parse::<axum::http::HeaderValue>().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
        .max_age(StdDuration::from_secs(3600));

    // Endpoints that require authentication
    let protected_routes = Router::new()
        .route("/chat", post(chat_handler))
        .route("/status", get(status_handler))
        .route("/memories/search", get(memories_search_handler))
        .route("/projects", get(projects_handler))
        .route("/projects/:id", get(project_detail_handler))
        .route("/devices/register", post(devices_register_handler))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // Public endpoints (health with state for uptime) and combine
    Router::new()
        .route("/health", get(health_handler))
        .merge(protected_routes)
        .layer(cors)
        .with_state(state.clone())
}

/// Get mobile bridge connection info (for Settings UI)
#[tauri::command]
pub async fn get_bridge_info(
    config: tauri::State<'_, Config>,
) -> Result<serde_json::Value, String> {
    let port = bridge_port_from_env();
    let host = if mobile_lan_enabled() {
        local_ip_addresses()
            .ok()
            .and_then(|addrs| addrs.into_iter().next())
            .unwrap_or_else(|| "127.0.0.1".to_string())
    } else {
        "127.0.0.1".to_string()
    };

    let lan_ip = local_ip_addresses()
        .ok()
        .and_then(|addrs| addrs.into_iter().next())
        .unwrap_or_else(|| "127.0.0.1".to_string());

    Ok(serde_json::json!({
        "token": config.mobile_bridge_token,
        "url": format!("http://{}:{}", host, port),
        "lanIp": lan_ip,
        "lanEnabled": mobile_lan_enabled(),
        "port": port
    }))
}

/// Start the HTTP server on the specified port
pub async fn start_server(state: Arc<AppState>, port: u16) -> anyhow::Result<()> {
    if load_allowed_origins().is_empty() {
        return Err(anyhow::anyhow!("No allowed CORS origins configured"));
    }

    let app = create_router(state);
    let addr = if mobile_lan_enabled() {
        std::net::SocketAddr::from(([0, 0, 0, 0], port))
    } else {
        std::net::SocketAddr::from(([127, 0, 0, 1], port))
    };

    tracing::info!("Nova Mobile Bridge starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
#[path = "http_server_tests.rs"]
mod tests;
