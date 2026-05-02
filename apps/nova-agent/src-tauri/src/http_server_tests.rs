use super::*;
use axum::body::Body;
use axum::http::Request;
use tower::util::ServiceExt;

fn test_config() -> Config {
    Config {
        deepseek_api_key: String::new(),
        deepseek_base_url: "https://api.deepseek.com/v1".to_string(),
        deepseek_model: "deepseek-v3.2".to_string(),
        groq_api_key: String::new(),
        openrouter_api_key: String::new(),
        huggingface_api_key: String::new(),
        huggingface_base_url: "https://api-inference.huggingface.co/v1".to_string(),
        kimi_api_key: String::new(),
        database_path: "D:\\databases".to_string(),
        workspace_root: "C:\\dev".to_string(),
        deepcode_ws_url: "ws://127.0.0.1:5004".to_string(),
        deepcode_ipc_enabled: false,
        trading_data_dir: "D:\\trading_data".to_string(),
        trading_logs_dir: "D:\\trading_logs".to_string(),
        chroma_url: "http://localhost:8000".to_string(),
        lance_db_path: "D:\\nova-agent-data\\lance-db".to_string(),
        mobile_bridge_token: "test-token".to_string(),
    }
}

fn test_state() -> Arc<AppState> {
    Arc::new(AppState {
        app_state: Arc::new(AsyncMutex::new(crate::modules::state::AgentState::default())),
        config: test_config(),
        db: Arc::new(AsyncMutex::new(None)),
        started_at: Instant::now(),
    })
}

#[tokio::test]
async fn protected_route_requires_authorization() {
    let app = create_router(test_state());
    let request = Request::builder()
        .uri("/status")
        .method(Method::GET)
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn cors_allows_configured_origin_on_preflight() {
    std::env::set_var("NOVA_MOBILE_ALLOWED_ORIGINS", "http://127.0.0.1:1420");

    let app = create_router(test_state());
    let request = Request::builder()
        .uri("/status")
        .method(Method::OPTIONS)
        .header(header::ORIGIN, "http://127.0.0.1:1420")
        .header(header::ACCESS_CONTROL_REQUEST_METHOD, "GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .unwrap(),
        "http://127.0.0.1:1420"
    );
}
