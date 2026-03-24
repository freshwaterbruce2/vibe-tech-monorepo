//! Vibe Code Studio — Tauri Backend
//!
//! Phase 1: Minimal window launch with Tauri 2.
//! The React frontend (Vite) is loaded as the webview content.
//! IPC commands will be added progressively in Phase 2+.

mod commands;
mod db;
mod pty;

use commands::greet;

use tauri::Manager;
use window_vibrancy::{apply_mica, apply_blur};

/// Configure and run the Tauri application.
///
/// Plugins registered:
/// - `tauri-plugin-shell`: External URL opening, command execution
/// - `tauri-plugin-dialog`: Native file/folder dialogs
/// - `tauri-plugin-fs`: File system access (scoped)
/// - `tauri-plugin-store`: Persistent key-value storage
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(pty::PtyState::default())
        .manage(db::DbState {
            conn: std::sync::Mutex::new(None),
        })
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            #[cfg(target_os = "windows")]
            {
                // Try applying Mica, fallback to Blur if unsupported
                let _ = apply_mica(&window, None)
                    .or_else(|_| apply_blur(&window, Some((18, 18, 18, 125))));
            }

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_dispose,
            db::db_get_patterns,
            db::db_save_pattern,
            db::db_execute_query
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vibe Code Studio");
}
