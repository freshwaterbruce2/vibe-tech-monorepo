//! Vibe-Flow — privacy-first local voice dictation.
//!
//! Phase 0 integration spike: global hotkey (Ctrl+Shift+Space) + text
//! injection into the focused window, with a tray icon and a small status
//! window. The mic → STT pipeline lands in Phase 1.

mod hotkey;
mod inject;

use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Runtime,
};

pub const STATUS_EVENT: &str = "vibe-flow://status";

#[derive(Serialize, Clone)]
struct StatusPayload<'a> {
    status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<&'a str>,
}

/// Emit a pipeline status event to the frontend (drives the pill UI).
pub fn emit_status<R: Runtime>(app: &AppHandle<R>, status: &str, detail: Option<&str>) {
    let _ = app.emit(STATUS_EVENT, StatusPayload { status, detail });
}

/// Manually inject text (used by the UI to test per-app injection methods).
#[tauri::command]
fn inject_text(text: String, method: Option<String>) -> Result<(), String> {
    inject::inject(&text, inject::InjectMethod::from_str(method.as_deref()))
}

fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Quit Vibe-Flow", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;
    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().ok_or(tauri::Error::WindowNotFound)?)
        .menu(&menu)
        .tooltip("Vibe-Flow — local voice dictation")
        .on_menu_event(|app, event| {
            if event.id() == "quit" {
                app.exit(0);
            }
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    hotkey::on_shortcut(app, shortcut, event.state());
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![inject_text])
        .setup(|app| {
            hotkey::register(app.handle())?;
            build_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running vibe-flow");
}
