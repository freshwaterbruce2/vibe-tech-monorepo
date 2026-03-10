//! Tauri IPC Commands — Phase 1
//!
//! Minimal command set to verify the IPC bridge works.
//! Phase 2 will add FS, PTY, Database, and other handlers.

/// Smoke-test command: proves frontend → Rust IPC is working.
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Vibe Code Studio Tauri backend is online.", name)
}
