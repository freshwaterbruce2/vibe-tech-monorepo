//! Global hotkey registration and press/release handling.
//!
//! Phase 0: Ctrl+Shift+Space. Pressed → status "listening"; Released →
//! status "processing", then inject the spike string and report back.
//! Phase 1 replaces the fixed string with the mic → STT pipeline output.

use crate::{emit_status, inject};
use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

pub const SPIKE_TEXT: &str = "Hello World from Vibe-Flow";

pub fn default_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space)
}

/// Register the default hotkey. Called from Tauri setup.
pub fn register<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    app.global_shortcut()
        .register(default_shortcut())
        .map_err(|e| tauri::Error::Anyhow(e.into()))
}

/// Handle a hotkey state change (wired into the plugin builder in lib.rs).
pub fn on_shortcut<R: Runtime>(app: &AppHandle<R>, shortcut: &Shortcut, state: ShortcutState) {
    if *shortcut != default_shortcut() {
        return;
    }
    match state {
        ShortcutState::Pressed => emit_status(app, "listening", None),
        ShortcutState::Released => {
            emit_status(app, "processing", None);
            let app = app.clone();
            // Injection sleeps (modifier-release delay) and calls SendInput;
            // keep it off the event loop thread.
            std::thread::spawn(move || {
                match inject::inject(SPIKE_TEXT, inject::InjectMethod::Type) {
                    Ok(()) => emit_status(&app, "injected", Some(SPIKE_TEXT)),
                    Err(e) => emit_status(&app, "error", Some(&e)),
                }
            });
        }
    }
}
