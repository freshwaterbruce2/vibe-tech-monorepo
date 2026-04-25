#![windows_subsystem = "windows"]

use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{error, info};
use tracing_appender::non_blocking::WorkerGuard;

mod activity_monitor;
mod context_engine;
mod database;
mod guidance_engine;
mod http_server;
mod modules;
mod task_executor;
mod websocket_client;

use modules::{
    calendar, copilot, credentials, db_handlers, execution, file_cleaner, filesystem, llm, memory,
    orchestrator, pattern_engine, prediction_engine, procedural_memory, project, prompts, rag,
    scheduler, screenshot, state::AgentState, state::AppState, state::Config, system_prompt, web,
};

struct IpcSender(tokio::sync::mpsc::Sender<websocket_client::IpcMessage>);

fn init_production_logging() -> Option<WorkerGuard> {
    let log_dir =
        std::env::var("NOVA_LOG_DIR").unwrap_or_else(|_| "D:\\logs\\nova-agent".to_string());
    let log_dir_full = std::path::PathBuf::from(&log_dir);

    if !log_dir.to_uppercase().starts_with("D:\\") {
        eprintln!("NOVA_LOG_DIR must be on D:\\ (got {})", log_dir);
        return None;
    }

    if let Err(e) = std::fs::create_dir_all(&log_dir_full) {
        eprintln!("Failed to create log dir {}: {}", log_dir, e);
        return None;
    }

    let file_appender = tracing_appender::rolling::daily(&log_dir_full, "nova-agent.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let subscriber = tracing_subscriber::fmt()
        .with_env_filter("info,nova_agent=debug")
        .with_writer(non_blocking)
        .with_ansi(false)
        .finish();

    let _ = tracing::subscriber::set_global_default(subscriber);
    Some(guard)
}

#[tauri::command]
async fn send_ipc_message(
    message: serde_json::Value,
    ipc: tauri::State<'_, IpcSender>,
) -> Result<(), String> {
    let msg: websocket_client::IpcMessage = serde_json::from_value(message)
        .map_err(|e| format!("Invalid IPC message format: {}", e))?;

    ipc.0
        .send(msg)
        .await
        .map_err(|e| format!("Failed to send IPC message: {}", e))?;
    Ok(())
}

#[tokio::main]
async fn main() {
    let _log_guard = init_production_logging();

    info!("Starting NOVA Agent Desktop Application");

    let config = Config::from_env();

    if let Err(e) = prompts::validate_required_prompts(&[
        "nova-core-v1",
        "nova-architect-v1",
        "nova-engineer-v1",
    ]) {
        error!("Prompt validation failed: {}", e);
        eprintln!("Prompt validation failed: {}", e);
        std::process::exit(1);
    }

    let db_service = match database::DatabaseService::new(PathBuf::from(&config.database_path)) {
        Ok(service) => {
            info!("Database service initialized successfully");

            // Initialize memory tables
            if let Err(e) = service.init_memory_tables() {
                error!("Failed to initialize memory tables: {}", e);
            } else {
                info!("Memory tables initialized");
            }

            match service.initialize_with_seed_data() {
                Ok((learning, tasks, activities)) => {
                    if learning > 0 || tasks > 0 || activities > 0 {
                        info!(
                            "Database seeded: {} learning events, {} tasks, {} activities",
                            learning, tasks, activities
                        );
                    } else {
                        info!("Database schema initialized");
                    }
                }
                Err(e) => {
                    error!("Failed to initialize database tables: {}", e);
                }
            }
            Some(service)
        }
        Err(e) => {
            error!("Failed to initialize database service: {}", e);
            None
        }
    };

    let app_state: AppState = Arc::new(AsyncMutex::new(AgentState::default()));
    let db_state = Arc::new(AsyncMutex::new(db_service));
    let db_for_monitor = Arc::clone(&db_state);
    let db_for_ipc = Arc::clone(&db_state);
    let db_for_executor = Arc::clone(&db_state);
    let app_state_for_ws = Arc::clone(&app_state);

    let (outbound_tx, mut outbound_rx) =
        tokio::sync::mpsc::channel::<websocket_client::IpcMessage>(100);
    let (inbound_tx, mut inbound_rx) =
        tokio::sync::mpsc::channel::<websocket_client::IpcMessage>(100);

    // Only spawn WebSocket IPC actor if enabled (connects to Vibe Code Studio)
    if config.deepcode_ipc_enabled {
        let ws_url = config.deepcode_ws_url.clone();
        info!("Vibe Code Studio IPC enabled, connecting to {}", ws_url);

        tokio::spawn(async move {
            let mut ws_client = websocket_client::DeepCodeClient::new(ws_url);
            let mut first_failure = true;

            ws_client.on_message(Arc::new(move |msg| {
                let _ = inbound_tx.try_send(msg);
            }));

            loop {
                match ws_client.connect().await {
                    Ok(_) => {
                        first_failure = true; // Reset for next disconnect cycle
                        info!("IPC: Connected to Vibe Code Studio");
                        {
                            let mut state = app_state_for_ws.lock().await;
                            state.ipc_connected = true;
                        }
                        loop {
                            tokio::select! {
                                Some(msg) = outbound_rx.recv() => {
                                    if let Err(e) = ws_client.send_ipc_message(msg).await {
                                        error!("Failed to send IPC message: {}", e);
                                    }
                                }
                                _ = tokio::time::sleep(std::time::Duration::from_secs(1)) => {
                                    if !ws_client.is_connected().await {
                                        info!("WebSocket Actor: Disconnected detected");
                                        break;
                                    }
                                }
                            }
                        }
                        {
                            let mut state = app_state_for_ws.lock().await;
                            state.ipc_connected = false;
                        }
                    }
                    Err(e) => {
                        let delay = ws_client.next_reconnect_delay().await;
                        // Only log first failure as warning, subsequent as debug (reduce noise)
                        if first_failure {
                            tracing::warn!(
                                "IPC: Vibe Code Studio not running ({}). Will retry in background.",
                                e
                            );
                            first_failure = false;
                        } else {
                            tracing::debug!("IPC: Vibe Code Studio retry in {:?}", delay);
                        }
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        });
    } else {
        info!("Vibe Code Studio IPC disabled. Running nova-agent standalone.");
        // Drain the channels to prevent memory buildup if IPC messages are sent
        tokio::spawn(async move {
            while outbound_rx.recv().await.is_some() {
                // Discard messages when IPC is disabled
            }
        });
    }

    // Initialize prediction engine
    let learning_db_path = PathBuf::from(&config.database_path).join("learning.db");
    let prediction_engine = match prediction_engine::PredictionEngine::new(learning_db_path) {
        Ok(engine) => {
            info!("Prediction engine initialized successfully");
            Some(engine)
        }
        Err(e) => {
            error!("Failed to initialize prediction engine: {}", e);
            None
        }
    };
    let prediction_engine_state = Arc::new(std::sync::Mutex::new(prediction_engine));
    let guidance_engine_state = Arc::new(guidance_engine::GuidanceEngine::new());
    let context_engine_state = Arc::new(std::sync::Mutex::new(context_engine::ContextEngine::new(
        config.workspace_root.clone(),
    )));

    tauri::Builder::default()
        .manage(config.clone())
        .manage(app_state.clone())
        .manage(db_state.clone())
        .manage(prediction_engine_state)
        .manage(guidance_engine_state)
        .manage(context_engine_state)
        .manage(IpcSender(outbound_tx))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(move |app| {
            info!("NOVA Agent setup completed successfully");

            // Start activity monitoring background service
            activity_monitor::spawn_activity_monitor(db_for_monitor, config.clone().workspace_root);

            // Start REST HTTP Server for Mobile Bridge
            let app_state_for_http = Arc::new(http_server::AppState {
                app_state: app_state.clone(),
                config: config.clone(),
                db: db_state.clone(),
                started_at: std::time::Instant::now(),
            });
            tauri::async_runtime::spawn(async move {
                let port = 3000;
                tracing::info!("Starting HTTP server for mobile bridge on port {}", port);
                if let Err(e) = http_server::start_server(app_state_for_http, port).await {
                    tracing::error!("Failed to start HTTP server: {}", e);
                }
            });

            // Start task executor background service
            let executor =
                task_executor::TaskExecutor::new(db_for_executor, Arc::new(config.clone()));
            tauri::async_runtime::spawn(async move {
                executor.start().await;
                info!("Task executor started with approval-gated background processing");
            });

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                while let Some(msg) = inbound_rx.recv().await {
                    {
                        let db_guard = db_for_ipc.lock().await;
                        if let Some(service) = db_guard.as_ref() {
                            match &msg {
                                websocket_client::IpcMessage::ActivitySync { payload } => {
                                    for activity in &payload.activities {
                                        let _ = service.log_activity(
                                            &activity.activity_type,
                                            &activity.details,
                                        );
                                    }
                                }
                                websocket_client::IpcMessage::LearningSync { payload } => {
                                    for event in &payload.events {
                                        let _ = service.log_learning_event(
                                            &event.event_type,
                                            &event.context,
                                            &event.outcome,
                                        );
                                    }
                                }
                                websocket_client::IpcMessage::TaskUpdate { payload } => {
                                    let _ = service.log_activity(
                                        "task_update",
                                        &format!("{}: {}", payload.task_id, payload.status),
                                    );
                                }
                                websocket_client::IpcMessage::FileOpen { payload } => {
                                    let _ = service.log_activity("file_open", &payload.path);
                                }
                                websocket_client::IpcMessage::GuidanceRequest { .. } => {
                                    let _ =
                                        service.log_activity("guidance_request", "IPC guidance");
                                }
                                websocket_client::IpcMessage::ContextUpdate { .. } => {
                                    let _ = service.log_activity("context_update", "IPC context");
                                }
                                websocket_client::IpcMessage::BridgeStatus { payload } => {
                                    let _ = service.log_activity(
                                        "bridge_status",
                                        &format!(
                                            "client={} connected={}",
                                            payload.client_id, payload.connected
                                        ),
                                    );
                                }
                            }
                        }
                    }

                    if let Err(e) = app_handle.emit("ipc-message", msg) {
                        error!("Failed to emit ipc-message event: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // LLM & Chat
            llm::chat_with_agent,
            llm::get_agent_status,
            llm::update_capabilities,
            llm::set_active_model,
            credentials::save_api_keys,
            credentials::get_api_key_status,
            // Filesystem
            filesystem::read_file,
            filesystem::write_file,
            file_cleaner::clean_old_files,
            // Screenshot
            screenshot::capture_screenshot,
            screenshot::capture_region,
            screenshot::list_screenshots,
            screenshot::delete_screenshot,
            // Code Execution
            execution::execute_code,
            orchestrator::orchestrate_desktop_action,
            // Memory
            memory::search_memories,
            memory::store_memory,
            memory::get_memory,
            memory::get_memories_by_type,
            memory::consolidate_memories,
            memory::prune_memories,
            memory::get_memory_overview,
            // Procedural Memory
            procedural_memory::recall_procedural,
            procedural_memory::record_procedural,
            procedural_memory::count_procedural_patterns,
            // Project
            project::create_project,
            project::get_available_templates,
            project::get_project_state,
            project::list_projects,
            // Web
            web::web_search,
            // Copilot
            copilot::index_codebase_command,
            copilot::search_patterns,
            copilot::get_copilot_stats_command,
            copilot::use_pattern,
            copilot::get_suggestions,
            // DB Handlers
            db_handlers::get_trading_config,
            db_handlers::log_activity,
            db_handlers::request_guidance,
            db_handlers::get_context_snapshot,
            db_handlers::get_tasks,
            db_handlers::get_task_by_id,
            db_handlers::update_task_status,
            db_handlers::get_recent_activities,
            db_handlers::get_focus_state,
            db_handlers::get_learning_events,
            db_handlers::get_task_stats,
            db_handlers::get_today_activity_count,
            db_handlers::log_learning_event,
            db_handlers::get_activities_in_range,
            db_handlers::get_learning_by_outcome,
            db_handlers::db_health_check,
            db_handlers::get_storage_health,
            db_handlers::create_task,
            db_handlers::get_deep_work_data,
            // Prediction Engine (ML-powered recommendations)
            prediction_engine::get_task_prediction,
            prediction_engine::get_productivity_insights,
            prediction_engine::get_proactive_recommendations,
            prediction_engine::assess_commit_risk_command,
            prediction_engine::recommend_task_timing_command,
            // RAG (Semantic Search)
            rag::rag_index_file,
            rag::rag_search,
            rag::rag_index_directory,
            rag::rag_clear_index,
            // System Prompt
            system_prompt::get_system_prompt,
            // Scheduler
            scheduler::generate_schedule,
            // Pattern Engine (Active Intelligence)
            pattern_engine::get_relevant_patterns,
            // Calendar
            calendar::get_calendar_events,
            calendar::add_calendar_event,
            calendar::delete_calendar_event,
            // IPC
            send_ipc_message,
            // Mobile Bridge
            http_server::get_bridge_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
